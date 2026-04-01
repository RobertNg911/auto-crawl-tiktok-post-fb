-- Storage Configuration for AutoCrawl
-- Buckets: videos, thumbnails

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES 
    ('videos', 'videos', false, 524288000, ARRAY['video/mp4', 'video/quicktime'], NOW(), NOW()),
    ('thumbnails', 'thumbnails', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'], NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Storage policies for videos bucket
-- Service role can manage videos
CREATE POLICY "Service role can manage videos" ON storage.objects
    FOR ALL USING (bucket_id = 'videos' AND auth.role() = 'service_role');

-- Authenticated users can upload videos
CREATE POLICY "Authenticated users can upload videos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() IN ('authenticated', 'service_role'));

-- Authenticated users can view videos
CREATE POLICY "Authenticated users can view videos" ON storage.objects
    FOR SELECT USING (bucket_id = 'videos' AND auth.role() IN ('authenticated', 'service_role', 'anon'));

-- Storage policies for thumbnails bucket
-- Service role can manage thumbnails
CREATE POLICY "Service role can manage thumbnails" ON storage.objects
    FOR ALL USING (bucket_id = 'thumbnails' AND auth.role() = 'service_role');

-- Anyone can view thumbnails (public)
CREATE POLICY "Public can view thumbnails" ON storage.objects
    FOR SELECT USING (bucket_id = 'thumbnails');

-- Authenticated users can upload thumbnails
CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'thumbnails' AND auth.role() IN ('authenticated', 'service_role'));

-- Authenticated users can update thumbnails
CREATE POLICY "Authenticated users can update thumbnails" ON storage.objects
    FOR UPDATE USING (bucket_id = 'thumbnails' AND auth.role() IN ('authenticated', 'service_role'));

-- Authenticated users can delete thumbnails
CREATE POLICY "Authenticated users can delete thumbnails" ON storage.objects
    FOR DELETE USING (bucket_id = 'thumbnails' AND auth.role() IN ('authenticated', 'service_role'));