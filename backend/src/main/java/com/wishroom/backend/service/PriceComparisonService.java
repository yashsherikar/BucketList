package com.wishroom.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wishroom.backend.dto.ItemDtos.ComparePricesResponse;
import com.wishroom.backend.dto.ItemDtos.PriceOffer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Compares a product's price across retailers using RapidAPI's "Real-Time
 * Product Search" API (Google Shopping data).
 *
 * Two calls: /search to resolve the query to a product_id, then /product-offers
 * to list each store's price for that product. Falls back to the single
 * aggregate search hit if /product-offers is empty or unavailable. Degrades to
 * an empty list (never throws) so the item view keeps working without a key.
 */
@Service
@Slf4j
public class PriceComparisonService {

    private static final String BASE = "https://real-time-product-search.p.rapidapi.com";
    private static final String RAPIDAPI_HOST = "real-time-product-search.p.rapidapi.com";
    private static final int TIMEOUT_MS = 8000;

    @Value("${app.rapidapi.key:}")
    private String rapidApiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(TIMEOUT_MS))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ComparePricesResponse comparePrices(String productQuery) {
        if (rapidApiKey == null || rapidApiKey.isBlank()) {
            log.warn("Price comparison: RAPIDAPI_KEY not configured, skipping");
            return new ComparePricesResponse(productQuery, Collections.emptyList());
        }
        if (productQuery == null || productQuery.isBlank()) {
            return new ComparePricesResponse(productQuery, Collections.emptyList());
        }

        try {
            JsonNode search = get(BASE + "/search?q=" + enc(productQuery)
                    + "&country=in&language=en&page=1&limit=10");
            if (search == null) {
                return new ComparePricesResponse(productQuery, Collections.emptyList());
            }

            JsonNode products = search.path("data").path("products");
            if (!products.isArray()) products = search.path("data"); // tolerate older array shape
            if (!products.isArray() || products.isEmpty()) {
                log.warn("Price comparison: no products for '{}'. Body: {}", productQuery, trunc(search.toString()));
                return new ComparePricesResponse(productQuery, Collections.emptyList());
            }

            JsonNode first = products.get(0);
            String productId = textOrNull(first.path("product_id"));
            String productTitle = textOrNull(first.path("product_title"));

            List<PriceOffer> offers = new ArrayList<>();

            // Per-store offers for the matched product.
            if (productId != null) {
                JsonNode po = get(BASE + "/product-offers?product_id=" + enc(productId)
                        + "&country=in&language=en");
                if (po != null) {
                    JsonNode arr = po.path("data");
                    if (arr.isObject()) arr = arr.path("offers");
                    if (arr.isArray()) {
                        for (JsonNode o : arr) {
                            String store = textOrNull(o.path("store_name"));
                            String link = firstNonNull(
                                    textOrNull(o.path("offer_page_url")),
                                    textOrNull(o.path("product_page_url")));
                            Double price = parsePrice(o.path("price"));
                            if (store != null && link != null) {
                                offers.add(new PriceOffer(store, productTitle, price, "INR", link,
                                        textOrNull(o.path("store_favicon"))));
                            }
                        }
                    }
                }
            }

            // Fallback: at least surface the aggregate Google Shopping hit.
            if (offers.isEmpty()) {
                String link = firstNonNull(
                        textOrNull(first.path("product_page_url")),
                        textOrNull(first.path("offer").path("offer_page_url")));
                Double price = parsePrice(first.path("price").isMissingNode()
                        ? first.path("offer").path("price") : first.path("price"));
                if (link != null) {
                    offers.add(new PriceOffer("Google Shopping", productTitle, price, "INR", link, null));
                }
            }

            if (offers.isEmpty()) {
                log.warn("Price comparison: 0 offers for '{}'. Search body: {}", productQuery, trunc(search.toString()));
            }

            offers.sort((a, b) -> {
                if (a.price() == null) return 1;
                if (b.price() == null) return -1;
                return Double.compare(a.price(), b.price());
            });

            return new ComparePricesResponse(productQuery, offers);

        } catch (Exception e) {
            log.warn("Price comparison: failed for '{}': {}", productQuery, e.getMessage());
            return new ComparePricesResponse(productQuery, Collections.emptyList());
        }
    }

    private JsonNode get(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMillis(TIMEOUT_MS))
                .header("x-rapidapi-host", RAPIDAPI_HOST)
                .header("x-rapidapi-key", rapidApiKey)
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            log.warn("Price comparison: {} returned HTTP {}", url.replaceFirst("\\?.*", ""), response.statusCode());
            return null;
        }
        return objectMapper.readTree(response.body());
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    private static String firstNonNull(String a, String b) {
        return a != null ? a : b;
    }

    private static String trunc(String s) {
        return s.length() > 800 ? s.substring(0, 800) : s;
    }

    private String textOrNull(JsonNode node) {
        return (node != null && !node.isMissingNode() && !node.isNull()) ? node.asText(null) : null;
    }

    /** Prices come back as numbers on some versions and strings like "₹1,499.00" / "$19.99" on others. */
    private Double parsePrice(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) return null;
        if (node.isNumber()) return node.asDouble();
        String digits = node.asText("").replaceAll("[^0-9.]", "");
        if (digits.isBlank()) return null;
        try {
            return Double.parseDouble(digits);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
