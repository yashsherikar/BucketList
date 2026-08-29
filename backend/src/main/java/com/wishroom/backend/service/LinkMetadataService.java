package com.wishroom.backend.service;

import com.wishroom.backend.dto.ItemDtos.LinkPreviewResponse;
import com.wishroom.backend.exception.ApiExceptions.BadRequestException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * Fetches a pasted product link server-side and reads its Open Graph / meta tags to build
 * a preview (title, image, source site). This is metadata-only — it never scrapes prices at
 * scale or bypasses anti-bot protections. Users still enter/confirm the price themselves.
 */
@Service
public class LinkMetadataService {

    private static final int TIMEOUT_MS = 6000;
    private static final String USER_AGENT =
            "Mozilla/5.0 (compatible; WishRoomLinkBot/1.0; +https://wishroom.app/bot)";

    public LinkPreviewResponse fetchPreview(String rawUrl) {
        String normalizedUrl = normalize(rawUrl);
        String source = extractHost(normalizedUrl);

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
            return new LinkPreviewResponse(normalizedUrl, null, null, source, null);
        }
    }

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
