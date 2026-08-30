package com.wishroom.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wishroom.backend.dto.ItemDtos.LinkPreviewResponse;
import com.wishroom.backend.exception.ApiExceptions.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Fetches a pasted product link server-side and reads its Open Graph / meta tags to build
 * a preview (title, image, source site). This is metadata-only — it never scrapes prices at
 * scale or bypasses anti-bot protections. Users still enter/confirm the price themselves.
 *
 * Strategy:
 *   1. Try a direct fetch with Jsoup (fast, no external dependency, works for most sites).
 *   2. If that comes back with no title AND no image (common on sites that block bots or are
 *      temporarily down), fall back to Microlink.io's free link-preview API, which handles
 *      JS-rendered pages and bot-blocking better than a raw HTML fetch.
 *   3. If both fail, degrade gracefully — the item is still created, just without a preview,
 *      and the user can fill in the details manually (or the nightly retry job picks it up).
 */
@Service
@Slf4j
public class LinkMetadataService {

    private static final int TIMEOUT_MS = 6000;
    private static final String USER_AGENT =
            "Mozilla/5.0 (compatible; WishRoomLinkBot/1.0; +https://wishroom.app/bot)";

    private static final String MICROLINK_ENDPOINT = "https://api.microlink.io/";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(TIMEOUT_MS))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public LinkPreviewResponse fetchPreview(String rawUrl) {
        String normalizedUrl = normalize(rawUrl);
        String source = extractHost(normalizedUrl);

        LinkPreviewResponse jsoupResult = fetchWithJsoup(normalizedUrl, source);

        boolean needsFallback = isBlank(jsoupResult.title()) && isBlank(jsoupResult.imageUrl());
        if (!needsFallback) {
            return jsoupResult;
        }

        log.info("Link preview: Jsoup fetch came back empty for {}, trying Microlink fallback", source);
        LinkPreviewResponse microlinkResult = fetchWithMicrolink(normalizedUrl, source);

        // Merge: prefer whichever source actually found each field.
        return new LinkPreviewResponse(
                normalizedUrl,
                firstNonBlank(jsoupResult.title(), microlinkResult.title()),
                firstNonBlank(jsoupResult.imageUrl(), microlinkResult.imageUrl()),
                source,
                jsoupResult.detectedPrice() != null ? jsoupResult.detectedPrice() : microlinkResult.detectedPrice()
        );
    }

    // ---------- Primary: direct Jsoup fetch ----------

    private LinkPreviewResponse fetchWithJsoup(String normalizedUrl, String source) {
        try {
            Document doc = Jsoup.connect(normalizedUrl)
                    .userAgent(USER_AGENT)
                    .timeout(TIMEOUT_MS)
                    .followRedirects(true)
                    .maxBodySize(2 * 1024 * 1024) // 2MB cap, we only need the <head>
                    .get();

            String title = firstNonBlank(
                    metaContent(doc, "meta[property=og:title]"),
                    metaContent(doc, "meta[name=twitter:title]"),
                    doc.title()
            );

            String image = firstNonBlank(
                    metaContent(doc, "meta[property=og:image]"),
                    metaContent(doc, "meta[name=twitter:image]")
            );

            Double detectedPrice = parsePrice(firstNonBlank(
                    metaContent(doc, "meta[property=product:price:amount]"),
                    metaContent(doc, "meta[property=og:price:amount]")
            ));

            return new LinkPreviewResponse(normalizedUrl, title, image, source, detectedPrice);

        } catch (Exception e) {
            // Fetch can fail for many reasons (bot walls, timeouts, dead links) — degrade gracefully
            // instead of blocking the user from adding the item at all.
            log.debug("Link preview: Jsoup fetch failed for {}: {}", source, e.getMessage());
            return new LinkPreviewResponse(normalizedUrl, null, null, source, null);
        }
    }

    // ---------- Fallback: Microlink.io ----------

    private LinkPreviewResponse fetchWithMicrolink(String normalizedUrl, String source) {
        try {
            String apiUrl = MICROLINK_ENDPOINT + "?url=" +
                    java.net.URLEncoder.encode(normalizedUrl, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(Duration.ofMillis(TIMEOUT_MS))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.debug("Link preview: Microlink returned HTTP {} for {}", response.statusCode(), source);
                return new LinkPreviewResponse(normalizedUrl, null, null, source, null);
            }

            JsonNode root = objectMapper.readTree(response.body());
            if (!"success".equalsIgnoreCase(root.path("status").asText())) {
                log.debug("Link preview: Microlink status not success for {}: {}", source, root.path("status").asText());
                return new LinkPreviewResponse(normalizedUrl, null, null, source, null);
            }

            JsonNode data = root.path("data");
            String title = textOrNull(data.path("title"));
            String image = textOrNull(data.path("image").path("url"));
            if (isBlank(image)) {
                image = textOrNull(data.path("logo").path("url"));
            }

            return new LinkPreviewResponse(normalizedUrl, title, image, source, null);

        } catch (Exception e) {
            log.debug("Link preview: Microlink fallback failed for {}: {}", source, e.getMessage());
            return new LinkPreviewResponse(normalizedUrl, null, null, source, null);
        }
    }

    // ---------- Helpers ----------

    private String normalize(String rawUrl) {
        String url = rawUrl.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        try {
            new URI(url);
        } catch (URISyntaxException e) {
            throw new BadRequestException("That doesn't look like a valid product link");
        }
        return url;
    }

    private String extractHost(String url) {
        try {
            String host = new URI(url).getHost();
            if (host == null) return null;
            return host.startsWith("www.") ? host.substring(4) : host;
        } catch (URISyntaxException e) {
            return null;
        }
    }

    private String metaContent(Document doc, String cssQuery) {
        Element el = doc.selectFirst(cssQuery);
        return el != null ? el.attr("content") : null;
    }

    private String textOrNull(JsonNode node) {
        return (node != null && !node.isMissingNode() && !node.isNull()) ? node.asText(null) : null;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    private Double parsePrice(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            String cleaned = raw.replaceAll("[^0-9.]", "");
            return cleaned.isBlank() ? null : Double.parseDouble(cleaned);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}