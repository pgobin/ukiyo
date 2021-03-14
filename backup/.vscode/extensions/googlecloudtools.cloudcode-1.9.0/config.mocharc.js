'use strict'

// note that this will not be read on `extest run-tests` due to a bug. Only `extest setup-and-test`.
module.exports = {
  "reporter": "xunit",
  "timeout": 3000000,
  "reporterOptions": {
    "output": `./sponge_uploader/${process.env.UI_TEST_NAME || 'ui-test'}/1_sponge_log.xml`
  }
}
