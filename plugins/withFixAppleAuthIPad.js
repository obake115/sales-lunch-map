const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix expo-apple-authentication crash / silent failure on iPad.
 *
 * Problems addressed:
 * 1. UIApplication.shared.keyWindow is deprecated since iOS 13 and returns nil
 *    on iPad (especially in iPhone compatibility mode), causing fatalError.
 * 2. UIWindowScene.windows is deprecated in iOS 15+; keyWindow property is
 *    the preferred API.
 * 3. In iPhone compatibility mode on iPad, the foreground active scene must
 *    be resolved correctly for ASAuthorizationController to present its UI.
 *
 * This plugin patches AppleAuthenticationRequest.swift to use a robust
 * window lookup chain that works on both iPhone and iPad (all iOS 15+).
 */
const withFixAppleAuthIPad = (config) =>
  withDangerousMod(config, [
    'ios',
    (config) => {
      const filePath = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        'expo-apple-authentication',
        'ios',
        'AppleAuthenticationRequest.swift'
      );

      if (!fs.existsSync(filePath)) {
        console.warn('[withFixAppleAuthIPad] AppleAuthenticationRequest.swift not found, skipping patch');
        return config;
      }

      let content = fs.readFileSync(filePath, 'utf-8');

      // Match the original buggy code (pre-patch)
      const buggyCode = `  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    guard let window = UIApplication.shared.keyWindow else {
      fatalError("Unable to present authentication modal because UIApplication.shared.keyWindow is not available")
    }
    return window
  }`;

      // Also match our previous patches (v1/v2/v3) to upgrade them
      const v1PatchMarker = '// Fixed: safe window lookup for iPad compatibility (keyWindow can be nil on iPad)';
      const v2PatchMarker = '// Fixed: robust window lookup for iPad compatibility (v2)';
      const v3PatchMarker = '// Fixed: strongest window lookup for iPad compatibility (v3)';

      const fixedCode = `  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    // Fixed: iPad iPhone-compatibility-mode safe window lookup (v4)
    var resolvedWindow: UIWindow?

    // 0. AppDelegate.window — most reliable on iPad compatibility mode
    if let appDelegateWindow = UIApplication.shared.delegate?.window ?? nil {
      resolvedWindow = appDelegateWindow
    }

    // 1. iOS 15+: foregroundActive scene's keyWindow
    if #available(iOS 15.0, *) {
      if resolvedWindow == nil,
        let scene = UIApplication.shared.connectedScenes
          .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
        resolvedWindow = scene.keyWindow
      }
      // 2. foregroundInactive scene's keyWindow
      if resolvedWindow == nil,
        let scene = UIApplication.shared.connectedScenes
          .first(where: { $0.activationState == .foregroundInactive }) as? UIWindowScene {
        resolvedWindow = scene.keyWindow
      }
      // 3. any connected scene's keyWindow or first window
      if resolvedWindow == nil,
        let scene = UIApplication.shared.connectedScenes
          .compactMap({ $0 as? UIWindowScene }).first {
        resolvedWindow = scene.keyWindow ?? scene.windows.first
      }
    }

    // 4. All scene windows flattened
    if resolvedWindow == nil {
      resolvedWindow = UIApplication.shared.connectedScenes
        .compactMap({ $0 as? UIWindowScene })
        .flatMap({ $0.windows })
        .first
    }

    // 5. Last resort: create window within the correct windowScene
    if resolvedWindow == nil {
      if let scene = UIApplication.shared.connectedScenes
          .compactMap({ $0 as? UIWindowScene }).first {
        resolvedWindow = UIWindow(windowScene: scene)
      } else {
        resolvedWindow = UIWindow(frame: UIScreen.main.bounds)
      }
      resolvedWindow?.makeKeyAndVisible()
    }

    print("[AppleAuth] presentationAnchor window: \\(String(describing: resolvedWindow)), frame: \\(resolvedWindow?.frame ?? .zero), isKeyWindow: \\(resolvedWindow?.isKeyWindow ?? false)")
    return resolvedWindow!
  }`;

      let patched = false;

      // Try patching original buggy code first
      if (content.includes('fatalError("Unable to present authentication modal')) {
        content = content.replace(buggyCode, fixedCode);
        patched = true;
      }
      // Try upgrading v1, v2, or v3 patch
      else if (content.includes(v1PatchMarker) || content.includes(v2PatchMarker) || content.includes(v3PatchMarker)) {
        // Replace the entire presentationAnchor function
        const funcStart = content.indexOf('  func presentationAnchor(for controller: ASAuthorizationController)');
        if (funcStart !== -1) {
          // Find the closing brace of the function (two spaces indent)
          let braceDepth = 0;
          let funcEnd = -1;
          for (let i = content.indexOf('{', funcStart); i < content.length; i++) {
            if (content[i] === '{') braceDepth++;
            if (content[i] === '}') {
              braceDepth--;
              if (braceDepth === 0) {
                funcEnd = i + 1;
                break;
              }
            }
          }
          if (funcEnd !== -1) {
            content = content.substring(0, funcStart) + fixedCode + content.substring(funcEnd);
            patched = true;
          }
        }
      }

      if (patched) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('[withFixAppleAuthIPad] Patched AppleAuthenticationRequest.swift (v4) successfully');
      } else {
        console.log('[withFixAppleAuthIPad] Already patched (v4) or code structure changed, skipping');
      }

      return config;
    },
  ]);

module.exports = withFixAppleAuthIPad;
