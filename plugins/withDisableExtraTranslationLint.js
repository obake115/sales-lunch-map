const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withDisableExtraTranslationLint = (config) =>
  withDangerousMod(config, [
    'android',
    (config) => {
      const lintXmlPath = path.join(
        config.modRequest.platformProjectRoot,
        'lint.xml'
      );
      const lintXml = `<?xml version="1.0" encoding="UTF-8"?>
<lint>
    <issue id="ExtraTranslation" severity="ignore" />
</lint>
`;
      fs.writeFileSync(lintXmlPath, lintXml);
      return config;
    },
  ]);

module.exports = withDisableExtraTranslationLint;
