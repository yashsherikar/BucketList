package com.wishroom.backend.service;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StoreReputationTest {

    private final StoreReputation rep =
            new StoreReputation(Set.of("amazon.in", "flipkart.com", "google.com"));

    @Test
    void allowlistedDomainsAndTheirSubdomainsPass() {
        assertTrue(rep.isAcceptable("https://www.amazon.in/dp/x", null, null));
        assertTrue(rep.isAcceptable("https://m.flipkart.com/p/x", null, null));
        assertTrue(rep.isAcceptable("https://www.google.com/shopping", null, null));
    }

    @Test
    void brandTyposquatIsHiddenEvenWithGreatRating() {
        assertFalse(rep.isAcceptable("https://amazon-deals-india.shop/x", null, null));
        assertFalse(rep.isAcceptable("https://flipkart-offers.online/x", 4.9, 5000));
    }

    @Test
    void riskyTldIsHidden() {
        assertFalse(rep.isAcceptable("https://cheapstuff.xyz/x", null, null));
        assertFalse(rep.isAcceptable("https://deals.top/x", null, null));
    }

    @Test
    void nonHttpsIsHidden() {
        assertFalse(rep.isAcceptable("http://someshop.com/x", null, null));
    }

    @Test
    void punycodeHostIsHidden() {
        assertFalse(rep.isAcceptable("https://xn--80ak6aa92e.com/x", null, null));
    }

    @Test
    void unknownButCleanStoreShownWhenApiHasNoOpinion() {
        assertTrue(rep.isAcceptable("https://someboutique.com/x", null, null));
    }

    @Test
    void unknownButCleanStoreShownWhenWellRated() {
        assertTrue(rep.isAcceptable("https://someboutique.com/x", 4.2, 150));
    }

    @Test
    void nullOrGarbageUrlHidden() {
        assertFalse(rep.isAcceptable(null, null, null));
        assertFalse(rep.isAcceptable("not a url", null, null));
    }
}
