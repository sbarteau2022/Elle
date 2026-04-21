{
  "targets": [
    {
      "target_name": "headphone_motion",
      "sources": ["src/addon.mm"],
      "include_dirs": [
        "<!(node -p \"require('node-addon-api').include_dir\")"
      ],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='mac'", {
          "xcode_settings": {
            "OTHER_CFLAGS": ["-ObjC++"],
            "MACOSX_DEPLOYMENT_TARGET": "11.0",
            "CLANG_ENABLE_OBJC_ARC": "YES"
          },
          "link_settings": {
            "libraries": [
              "-framework CoreMotion",
              "-framework Foundation"
            ]
          }
        }]
      ]
    }
  ]
}
