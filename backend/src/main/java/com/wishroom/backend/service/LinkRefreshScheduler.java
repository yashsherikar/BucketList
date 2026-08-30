package com.wishroom.backend.service;

import com.wishroom.backend.dto.ItemDtos.LinkPreviewResponse;
import com.wishroom.backend.entity.BucketItem;
import com.wishroom.backend.repository.BucketItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/**
 * Retries link-preview fetching for items that failed the first time around
 * (e.g. the site was under maintenance, rate-limited us, or timed out). Runs
 * once a day at midnight IST so a temporary outage on a retailer's site doesn't
 * leave items permanently missing their image/title.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LinkRefreshScheduler {

	private final BucketItemRepository bucketItemRepository;
	private final LinkMetadataService linkMetadataService;

	/** Runs every day at 00:00 Asia/Kolkata. */
	@Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
	public void refreshFailedLinkPreviews() {
		List<BucketItem> pending = bucketItemRepository.findByImageUrlIsNull();
		if (pending.isEmpty()) {
			log.info("Link refresh: nothing to retry");
			return;
		}

		log.info("Link refresh: retrying {} item(s) with missing images", pending.size());
		int fixed = 0;

		for (BucketItem item : pending) {
			try {
				LinkPreviewResponse preview = linkMetadataService.fetchPreview(item.getUrl());

				boolean updated = false;
				if (preview.imageUrl() != null) {
					item.setImageUrl(preview.imageUrl());
					updated = true;
				}
				if ((item.getTitle() == null || item.getTitle().isBlank()) && preview.title() != null) {
					item.setTitle(preview.title());
					updated = true;
				}
				// Never overwrite a price the user has already entered manually.
				if (item.getPrice() == null && preview.detectedPrice() != null) {
					item.setPrice(preview.detectedPrice());
					updated = true;
				}

				if (updated) {
					item.setUpdatedAt(Instant.now());
					bucketItemRepository.save(item);
					fixed++;
				}
			} catch (Exception e) {
				log.warn("Link refresh: failed to retry item {}: {}", item.getId(), e.getMessage());
			}
		}

		log.info("Link refresh: fixed {} of {} item(s)", fixed, pending.size());
	}
}