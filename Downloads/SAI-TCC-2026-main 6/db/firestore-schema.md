# Firestore Collections (StylistAI)

## Root collections
- `sai-users`
- `sai-brands`
- `sai-brandLogoCatalog`
- `sai-markets`
- `sai-pieceItems`
- `sai-wardrobeItems`
- `sai-schemes`

- `sai-userPosts`
- `sai-outfitExports`

## Subcollection
- `sai-schemes/{schemeId}/items`

## Relationship simulation via IDs
- `sai-pieceItems.brand_id -> sai-brands.brand_id`
- `sai-pieceItems.market_id -> sai-markets.market_id`
- `sai-wardrobeItems.user_id -> sai-users.user_id`
- `sai-wardrobeItems.brand_id -> sai-brands.brand_id`
- `sai-wardrobeItems.market_id -> sai-markets.market_id`
- `sai-brandLogoCatalog.brand_id -> sai-brands.brand_id`
- `sai-schemes.user_id -> sai-users.user_id`
- `sai-schemes/{schemeId}/items/{schemeItemId}.wardrobe_item_id -> sai-wardrobeItems.wardrobe_item_id`

## 3D pipeline fields on `sai-wardrobeItems`
- `model_status`: `queued_base | base_done | queued_branding | done | failed | needs_brand_review`
- `model_base_3d_url`, `model_branded_3d_url`, `model_3d_url`, `model_preview_url`
- `brand_id_selected`, `brand_id_detected`, `brand_detection_confidence`, `brand_detection_source`
- `brand_applied`, `placement_profile_id`, `branding_pass_version`
- `sai-brandLogoCatalog.detection_aliases` is required for image-first brand matching

All relationship integrity is validated in the Service layer before writes.

## Dress tester 2D collections
- `mannequin_2d`
- `wardrobe_piece_2d`
- `outfit_selection_2d`

### 2D asset pipeline lifecycle
`wardrobe_piece_2d.asset_status`
- `draft`
- `asset_pending`
- `asset_review`
- `ready_for_tester`
- `published`

### 2D composition rules
- `wardrobe_piece_2d.render_layer` controls ordering (ascending).
- `wardrobe_piece_2d.hides_piece_types` applies category-level hiding (e.g. dress hides top + bottom).
- `wardrobe_piece_2d.conflicts_with` blocks incompatible piece IDs.


## Social publishing / export collections
- `sai-userPosts` stores publication lifecycle per outfit card (draft, ready, exported, published, failed).
- `sai-outfitExports` stores each export operation with platform + format metadata and generated asset URL.
- Recommended scheme extension fields: `is_published`, `published_platforms`, `export_count`, `last_exported_at`, `social_ready_asset_url`.
