const {
  withXcodeProject,
  withEntitlementsPlist,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const APP_GROUP = 'group.jp.kawashun.saleslunchmap';
const WIDGET_NAME = 'LunchMapWidget';
const WIDGET_BUNDLE_ID = 'jp.kawashun.saleslunchmap.widget';

// ──────────────────────────────────────────────
// 1. Add App Groups entitlement to main app
// ──────────────────────────────────────────────
function withAppGroupEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.security.application-groups'] = [APP_GROUP];
    return mod;
  });
}

// ──────────────────────────────────────────────
// 2. Write native files to ios/ during prebuild
// ──────────────────────────────────────────────
function withWidgetFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const iosDir = path.join(projectRoot, 'ios');
      const widgetDir = path.join(iosDir, WIDGET_NAME);

      fs.mkdirSync(widgetDir, { recursive: true });

      // Copy widget Swift files from widgets/ directory
      const widgetsSrcDir = path.join(projectRoot, 'widgets');
      for (const file of [
        'LunchMapWidget.swift',
        'LunchMapWidgetBundle.swift',
      ]) {
        const src = path.join(widgetsSrcDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(widgetDir, file));
        }
      }

      // Widget Info.plist
      fs.writeFileSync(
        path.join(widgetDir, 'Info.plist'),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>ランチマップ</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`
      );

      // Widget entitlements
      fs.writeFileSync(
        path.join(widgetDir, `${WIDGET_NAME}.entitlements`),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>`
      );

      // Native module: ObjC bridge for WidgetDataBridge
      const appDir = path.join(iosDir, 'app');
      fs.writeFileSync(
        path.join(appDir, 'WidgetDataBridge.m'),
        `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetDataBridge, NSObject)
RCT_EXTERN_METHOD(setData:(NSString *)jsonString)
@end
`
      );

      // Native module: Swift implementation
      fs.writeFileSync(
        path.join(appDir, 'WidgetDataBridge.swift'),
        `import Foundation
import WidgetKit

@objc(WidgetDataBridge)
class WidgetDataBridge: NSObject {
  private let suiteName = "${APP_GROUP}"

  @objc func setData(_ jsonString: String) {
    guard let data = jsonString.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return }

    let defaults = UserDefaults(suiteName: suiteName)
    for (key, value) in json {
      defaults?.set(value, forKey: key)
    }
    defaults?.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
`
      );

      return mod;
    },
  ]);
}

// ──────────────────────────────────────────────
// 3. Add widget extension target to Xcode project
// ──────────────────────────────────────────────
function withWidgetTarget(config) {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;

    // Check if widget target already exists
    const existingTargets = project.pbxNativeTargetSection();
    for (const key in existingTargets) {
      if (typeof existingTargets[key] === 'object' && existingTargets[key].name === `"${WIDGET_NAME}"`) {
        console.log(`[withLunchMapWidget] Widget target "${WIDGET_NAME}" already exists, skipping`);
        return mod;
      }
    }

    // Add the widget extension target
    const target = project.addTarget(
      WIDGET_NAME,
      'app_extension',
      WIDGET_NAME,
      WIDGET_BUNDLE_ID
    );

    if (!target) {
      console.warn('[withLunchMapWidget] Failed to add widget target');
      return mod;
    }

    // Update build settings for the widget target
    const configs = project.pbxXCBuildConfigurationSection();
    for (const key in configs) {
      const entry = configs[key];
      if (typeof entry !== 'object' || !entry.buildSettings) continue;

      const bs = entry.buildSettings;
      if (
        bs.PRODUCT_BUNDLE_IDENTIFIER === `"${WIDGET_BUNDLE_ID}"` ||
        bs.PRODUCT_BUNDLE_IDENTIFIER === WIDGET_BUNDLE_ID
      ) {
        bs.SWIFT_VERSION = '5.0';
        bs.TARGETED_DEVICE_FAMILY = '"1,2"';
        bs.IPHONEOS_DEPLOYMENT_TARGET = '17.0';
        bs.CODE_SIGN_ENTITLEMENTS = `"${WIDGET_NAME}/${WIDGET_NAME}.entitlements"`;
        bs.INFOPLIST_FILE = `"${WIDGET_NAME}/Info.plist"`;
        bs.CURRENT_PROJECT_VERSION = '1';
        bs.MARKETING_VERSION = '1.0.0';
        bs.SKIP_INSTALL = 'YES';
        bs.SWIFT_EMIT_LOC_STRINGS = 'YES';
        bs.GENERATE_INFOPLIST_FILE = 'YES';
        // Ensure WidgetKit is linked
        bs.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
      }
    }

    // Add WidgetKit and SwiftUI frameworks to the widget target
    const frameworksBuildPhase = project.pbxFrameworksBuildPhaseObj(target.uuid);
    if (frameworksBuildPhase) {
      project.addFramework('WidgetKit.framework', {
        target: target.uuid,
        link: true,
      });
      project.addFramework('SwiftUI.framework', {
        target: target.uuid,
        link: true,
      });
    }

    // Add widget source files to the target's Sources build phase
    const widgetGroup = project.addPbxGroup(
      [
        'LunchMapWidget.swift',
        'LunchMapWidgetBundle.swift',
        'Info.plist',
        `${WIDGET_NAME}.entitlements`,
      ],
      WIDGET_NAME,
      WIDGET_NAME
    );

    // Add the group to the main project
    const mainGroupId = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(widgetGroup.uuid, mainGroupId);

    // Add Swift files to the widget target's build phase
    project.addSourceFile(
      `${WIDGET_NAME}/LunchMapWidget.swift`,
      { target: target.uuid },
      widgetGroup.uuid
    );
    project.addSourceFile(
      `${WIDGET_NAME}/LunchMapWidgetBundle.swift`,
      { target: target.uuid },
      widgetGroup.uuid
    );

    // Add Embed App Extensions build phase to main app target
    const mainTarget = project.getFirstTarget();
    if (mainTarget && mainTarget.firstTarget) {
      const mainTargetUuid = mainTarget.firstTarget.uuid;

      // Find the widget product reference
      const productRef = target.pbxNativeTarget?.productReference;
      if (productRef) {
        // Add a Copy Files build phase to embed the extension
        project.addBuildPhase(
          [`${WIDGET_NAME}.appex`],
          'PBXCopyFilesBuildPhase',
          'Embed App Extensions',
          mainTargetUuid,
          'app_extension'
        );
      }
    }

    console.log(`[withLunchMapWidget] Added widget target "${WIDGET_NAME}" successfully`);
    return mod;
  });
}

// ──────────────────────────────────────────────
// Main plugin
// ──────────────────────────────────────────────
function withLunchMapWidget(config) {
  // App Groups entitlement disabled — requires provisioning profile update on Apple Developer Portal.
  // Re-enable when widget target is ready.
  // config = withAppGroupEntitlement(config);
  config = withWidgetFiles(config);
  // Widget target addition is disabled for now — the xcode package's addTarget
  // produces a pbxproj that breaks React Native's Podfile post_install hook.
  // The widget SwiftUI files + native bridge + App Groups entitlement are ready.
  // Widget target will be added once EAS / expo-apple-targets supports it natively.
  // config = withWidgetTarget(config);
  return config;
}

module.exports = withLunchMapWidget;
