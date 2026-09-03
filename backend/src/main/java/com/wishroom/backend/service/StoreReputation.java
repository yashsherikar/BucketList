package com.wishroom.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

/**
 * Decides whether a store shown in price comparison is trustworthy, using ONLY a
 * bundled allowlist plus local string heuristics. No external API, no key, no
 * quota — free for the life of the project.
 *
 *   - allowlisted registrable domain            -> always shown
 *   - clear scam signals (risky TLD, brand
 *     typosquat, punycode, hyphen/digit soup,
 *     no HTTPS)                                  -> always hidden
 *   - anything in between                        -> shown only if the search API
 *                                                  itself rated the store well,
 *                                                  or had no opinion and the
 *                                                  domain looks completely plain
 */
@Component
@Slf4j
public class StoreReputation {

    private static final String ALLOWLIST_RESOURCE = "/trusted-stores.txt";

    /** TLDs disproportionately used by throwaway scam shops. */
    private static final Set<String> RISKY_TLDS = Set.of(
            "xyz", "top", "online", "shop", "store", "buzz", "click", "icu", "cyou",
            "rest", "fit", "gq", "cf", "ml", "tk", "ga", "monster", "quest", "sbs", "life"
    );

    /** Brand tokens a scam domain loves to borrow ("amazon-deals-india.shop"). */
    private static final Set<String> BRAND_TOKENS = Set.of(
            "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "snapdeal",
            "croma", "reliance", "tatacliq", "jiomart", "apple", "samsung", "boat",
            "oneplus", "xiaomi", "titan", "tanishq", "lenskart", "decathlon"
    );

    private final Set<String> allowlist = new HashSet<>();

    public StoreReputation() {
        try (InputStream in = getClass().getResourceAsStream(ALLOWLIST_RESOURCE)) {
            if (in == null) {
                log.warn("StoreReputation: {} not on classpath — allowlist empty", ALLOWLIST_RESOURCE);
            } else {
                try (BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = r.readLine()) != null) {
                        String d = line.trim().toLowerCase();
                        if (!d.isEmpty() && !d.startsWith("#")) allowlist.add(d);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("StoreReputation: failed to load allowlist: {}", e.getMessage());
        }
        log.info("StoreReputation: {} trusted domains loaded", allowlist.size());
    }

    /** Test / non-Spring constructor. */
    StoreReputation(Set<String> allowlistDomains) {
        allowlist.addAll(allowlistDomains);
    }

    /**
     * @param storeUrl   the offer's link (used for the domain checks)
     * @param apiRating  store rating the search API reported, or null
     * @param apiReviews store review count the search API reported, or null
     */
    public boolean isAcceptable(String storeUrl, Double apiRating, Integer apiReviews) {
        String host = host(storeUrl);
        if (host == null) return false;

        if (allowlisted(host)) return true;

        int risk = riskScore(host, storeUrl);
        if (risk >= 2) {
            log.info("StoreReputation: hiding '{}' (risk {})", host, risk);
            return false;
        }

        boolean apiOk = apiRating != null && apiRating >= 3.5
                && apiReviews != null && apiReviews >= 20;
        if (risk == 0 && apiOk) return true;              // unknown but clean + well rated
        if (risk == 0 && apiRating == null) return true;  // unknown, clean, API had no opinion

        log.info("StoreReputation: hiding '{}' (risk {}, rating {}, reviews {})", host, risk, apiRating, apiReviews);
        return false;
    }

    // --- internals ---

    private boolean allowlisted(String host) {
        if (allowlist.contains(host)) return true;
        for (String d : allowlist) {
            if (host.endsWith("." + d)) return true; // www.amazon.in / m.amazon.in -> amazon.in
        }
        return false;
    }

    private int riskScore(String host, String url) {
        int risk = 0;

        if (url == null || !url.toLowerCase().startsWith("https://")) risk += 2;

        String tld = host.contains(".") ? host.substring(host.lastIndexOf('.') + 1) : "";
        if (RISKY_TLDS.contains(tld)) risk += 2;

        if (host.startsWith("xn--") || host.contains(".xn--")) risk += 2; // punycode / homograph

        if (host.chars().filter(c -> c == '-').count() >= 2) risk += 1;
        if (host.chars().filter(Character::isDigit).count() >= 3) risk += 1;

        String label = registrableLabel(host);
        for (String brand : BRAND_TOKENS) {
            if (label.contains(brand) && !label.equals(brand)) { // borrows a brand name, isn't it
                risk += 3;
                break;
            }
        }

        return risk;
    }

    /** "deals.amazon-india.shop" -> "amazon-india" */
    private String registrableLabel(String host) {
        String[] parts = host.split("\\.");
        return parts.length >= 2 ? parts[parts.length - 2] : host;
    }

    private static String host(String url) {
        try {
            String h = URI.create(url).getHost();
            return h == null ? null : h.toLowerCase();
        } catch (Exception e) {
            return null;
        }
    }
}
