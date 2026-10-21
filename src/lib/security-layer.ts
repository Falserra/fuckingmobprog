// SecurityLayer (Master File §5.4.3): screen-sharing detection for the OTP step.
//
// Neither iOS nor Android exposes a public API that tells an app "a Messenger/Zoom
// call is sharing your screen", and expo-screen-capture only offers screenshot
// events. So CiCo does two things:
//  1. Always blocks capture on the OTP screen (usePreventScreenCapture). On Android
//     this sets FLAG_SECURE, so anyone watching a shared screen sees black.
//  2. Exposes detectScreenSharing() for the warning/mask flow. In this prototype
//     the signal comes from a demo toggle (Dashboard › Security demo) so the flow
//     in Figure 6 / Figure 12 can be demonstrated. A production build would replace
//     this with a native module (e.g. UIScreen.isCaptured on iOS, DisplayManager /
//     MediaProjection checks on Android).

let simulatedSharing = false;

export function setSimulatedScreenSharing(active: boolean) {
  simulatedSharing = active;
}

export function isSimulatedScreenSharing() {
  return simulatedSharing;
}

export async function detectScreenSharing(): Promise<'active' | 'inactive'> {
  return simulatedSharing ? 'active' : 'inactive';
}
