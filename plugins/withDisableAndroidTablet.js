const { withAndroidManifest } = require('@expo/config-plugins');

const withDisableAndroidTablet = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['supports-screens'] = {
      $: {
        'android:smallScreens': 'true',
        'android:normalScreens': 'true',
        'android:largeScreens': 'false',
        'android:xlargeScreens': 'false',
        'android:anyDensity': 'true',
      },
    };
    return config;
  });

module.exports = withDisableAndroidTablet;
