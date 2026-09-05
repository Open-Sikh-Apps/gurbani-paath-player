/** Native splash `imageWidth` and the JS splash image size must stay the same. */
export const SPLASH_IMAGE_WIDTH = 200;

/** Android 12+ SplashScreen always circle-masks the icon; JS matches that clip. iOS native is square. */
export const SPLASH_ANDROID_CORNER_RADIUS = SPLASH_IMAGE_WIDTH / 2;
