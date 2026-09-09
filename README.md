# Backward Clock V4

V4 focuses on the iPhone lock-screen-like presentation:
- Only **3 widgets** are visible, directly below the clock.
- The three slots are **left / center / right** and can be reassigned in Settings.
- Available widgets: Spotify/Music, Weather, Prayer, Date, Battery, Custom.
- Wallpaper is saved on the device after the first selection.
- Widget selection/order is saved.
- The show animates only the clock; widgets remain fixed.
- PWA is configured for portrait fullscreen and has a V4 service-worker cache.

## iPhone
After GitHub Pages publishes the repository:
1. Open the Pages address in Safari.
2. Use Share -> Add to Home Screen.
3. Launch from the Home Screen icon.

If an older version still appears, remove the old Home Screen icon and add it again after refreshing the Pages site. V4 uses a new cache name to avoid retaining the old CSS/JS.

Note: live Spotify metadata, live weather/prayer APIs, and production-grade hand tracking are best implemented in the native SwiftUI version.
