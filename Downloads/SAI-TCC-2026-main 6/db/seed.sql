INSERT INTO users (user_id, name, email, password_hash, role, preferred_styles)
VALUES (1, 'Aria Style', 'aria@sai.dev', 'hash', 'user', 'minimal,street');

INSERT INTO brands (brand_id, name, is_active) VALUES
(1, 'Maison Noire', TRUE),
(2, 'Archetype', TRUE),
(3, 'North Atelier', TRUE);

INSERT INTO markets (market_id, season, gender) VALUES
(1, 'Winter', 'Unisex'),
(2, 'Summer', 'Female'),
(3, 'Fall', 'Male');

INSERT INTO piece_items (piece_item_id, brand_id, market_id, name, image_url, piece_type, color, material, store_url, price_range, is_active)
VALUES
(1, 1, 1, 'Obsidian Tailored Blazer', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800', 'upper', 'Black', 'Wool', '#', '$$$', TRUE),
(2, 2, 2, 'Luxe Knit Polo', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', 'upper', 'White', 'Cotton', '#', '$$', TRUE),
(3, 3, 3, 'Textured Wide-Leg Pants', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800', 'lower', 'Khaki', 'Linen', '#', '$$', TRUE),
(4, 1, 1, 'Urban Leather Boots', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800', 'shoes', 'Brown', 'Leather', '#', '$$$', TRUE);

INSERT INTO wardrobe_items (wardrobe_item_id, user_id, brand_id, market_id, name, image_url, piece_type, color, material, style_tags, occasion_tags, is_favorite)
VALUES
(1, 1, 1, 1, 'Midnight Blazer', 'https://images.unsplash.com/photo-1593032465171-8bd2f0cf7f85?w=800', 'upper', 'Black', 'Wool', 'formal,minimal', 'work,event', TRUE),
(2, 1, 2, 2, 'Ivory Polo', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800', 'upper', 'Ivory', 'Cotton', 'casual', 'daily', FALSE),
(3, 1, 3, 3, 'Charcoal Trousers', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800', 'lower', 'Charcoal', 'Linen', 'smart', 'work', FALSE),
(4, 1, 1, 1, 'Leather Boots', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800', 'shoes', 'Brown', 'Leather', 'street', 'night', TRUE);

INSERT INTO schemes (scheme_id, user_id, title, description, creation_mode, style, occasion, visibility, community_indexed)
VALUES (1, 1, 'Noir Utility Capsule', 'Balanced city formal look.', 'manual', 'Minimal', 'Work', 'public', TRUE);

INSERT INTO scheme_items (scheme_item_id, scheme_id, wardrobe_item_id, slot, sort_order)
VALUES
(1, 1, 1, 'upper', 1),
(2, 1, 3, 'lower', 2),
(3, 1, 4, 'shoes', 3);
