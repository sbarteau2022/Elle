#import <CoreMotion/CoreMotion.h>
#import <Foundation/Foundation.h>
#include <napi.h>

// CMHeadphoneMotionManager reads head pose from AirPods Pro (H2+).
// Available on macOS 11.0+. No Bluetooth pairing code needed —
// the OS handles device association; CoreMotion surfaces the data.

static CMHeadphoneMotionManager *gManager = nil;
static Napi::ThreadSafeFunction gTSFN;
static bool gRunning = false;

Napi::Value StartMotion(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (gRunning) return env.Undefined();
  if (!info[0].IsFunction()) {
    Napi::TypeError::New(env, "Expected a callback function").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  gTSFN = Napi::ThreadSafeFunction::New(
    env,
    info[0].As<Napi::Function>(),
    "HeadMotionCallback",
    0,  // unlimited queue
    1   // initial thread count
  );

  gManager = [[CMHeadphoneMotionManager alloc] init];

  if (!gManager.isDeviceMotionAvailable) {
    gTSFN.Release();
    Napi::Error::New(env, "CMHeadphoneMotionManager: device motion not available. "
                          "Ensure AirPods Pro are connected and macOS >= 11.0.")
      .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  [gManager startDeviceMotionUpdatesToQueue:[NSOperationQueue mainQueue]
    withHandler:^(CMDeviceMotion * _Nullable motion, NSError * _Nullable error) {
      if (error != nil || motion == nil) return;

      double pitch = motion.attitude.pitch;
      double roll  = motion.attitude.roll;
      double yaw   = motion.attitude.yaw;

      auto callback = [pitch, roll, yaw](Napi::Env cbEnv, Napi::Function jsCallback) {
        Napi::Object data = Napi::Object::New(cbEnv);
        data.Set("pitch", Napi::Number::New(cbEnv, pitch));
        data.Set("roll",  Napi::Number::New(cbEnv, roll));
        data.Set("yaw",   Napi::Number::New(cbEnv, yaw));
        jsCallback.Call({ data });
      };

      gTSFN.NonBlockingCall(callback);
    }];

  gRunning = true;
  return env.Undefined();
}

Napi::Value StopMotion(const Napi::CallbackInfo &info) {
  if (!gRunning) return info.Env().Undefined();

  if (gManager != nil) {
    [gManager stopDeviceMotionUpdates];
    gManager = nil;
  }

  gTSFN.Release();
  gRunning = false;
  return info.Env().Undefined();
}

Napi::Value IsAvailable(const Napi::CallbackInfo &info) {
  CMHeadphoneMotionManager *probe = [[CMHeadphoneMotionManager alloc] init];
  bool available = probe.isDeviceMotionAvailable;
  return Napi::Boolean::New(info.Env(), available);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("startMotion", Napi::Function::New(env, StartMotion));
  exports.Set("stopMotion",  Napi::Function::New(env, StopMotion));
  exports.Set("isAvailable", Napi::Function::New(env, IsAvailable));
  return exports;
}

NODE_API_MODULE(headphone_motion, Init)
