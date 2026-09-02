package com.wishroom.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wishroom.backend.dto.ItemDtos.ComparePricesResponse;
import com.wishroom.backend.dto.ItemDtos.PriceOffer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Compares a product's price across multiple retailers using RapidAPI's
 * "Real-Time Product Search" API (Google Shopping data under the hood).
 *
 * Requires the RAPIDAPI_KEY environment variable to be set. If it's missing
 * or the upstream call fails for any reason, this degrades gracefully and
 * returns an empty offer list rather than breaking the item detail view.
 */
@Service
@Slf4j
public class PriceComparisonService {

    private static final String SEARCH_ENDPOINT = "https://real-time-product-search.p.rapidapi.com/search";
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
            String apiUrl = SEARCH_ENDPOINT
                    + "?q=" + java.net.URLEncoder.encode(productQuery, StandardCharsets.UTF_8)
                    + "&country=in&language=en&page=1&limit=10";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(Duration.ofMillis(TIMEOUT_MS))
                    .header("x-rapidapi-host", RAPIDAPI_HOST)
                    .header("x-rapidapi-key", rapidApiKey)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Price comparison: RapidAPI returned HTTP {} for query '{}'", response.statusCode(), productQuery);
                return new ComparePricesResponse(productQuery, Collections.emptyList());
            }

            JsonNode root = objectMapper.readTree(response.body());
            // The API has shipped the product list as both `data` (array) and
            // `data.products` (array) across versions — accept whichever is present.
            JsonNode results = root.path("data");
            if (!results.isArray()) {
                results = root.path("data").path("products");
            }

            List<PriceOffer> offers = new ArrayList<>();
            if (results.isArray()) {
                for (JsonNode node : results) {
                    JsonNode offerNode = node.path("offer");
                    String platform = textOrNull(offerNode.path("store_name"));
                    Double price = parsePrice(offerNode.path("price"));
                    String link = textOrNull(offerNode.path("offer_page_url"));
                    String title = textOrNull(node.path("product_title"));
                    String thumbnail = textOrNull(node.path("product_photos").isArray() && node.path("product_photos").size() > 0
                            ? node.path("product_photos").get(0) : null);

                    if (platform != null && link != null) {
                        offers.add(new PriceOffer(platform, title, price, "INR", link, thumbnail));
                    }
                }
            }

            if (offers.isEmpty()) {
                String body = response.body();
                log.warn("Price comparison: 0 offers parsed for query '{}'. Raw response starts: {}",
                        productQuery, body.substring(0, Math.min(body.length(), 500)));
            }

            offers.sort((a, b) -> {
                if (a.price() == null) return 1;
                if (b.price() == null) return -1;
                return Double.compare(a.price(), b.price());
            });

            return new ComparePricesResponse(productQuery, offers);

        } catch (Exception e) {
            log.warn("Price comparison: failed for query '{}': {}", productQuery, e.getMessage());
            return new ComparePricesResponse(productQuery, Collections.emptyList());
        }
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
