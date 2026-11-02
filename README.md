# Shapesmith

**Describe it. Refine it. Download it.**

Shapesmith is an app for macOS, Windows, iOS and Android that turns plain-language
descriptions into 3D models. It uses **your own Claude API key**.

1. **Enter your API key** the first time you open the app. It is saved in your device's
   secure storage and sent only to Anthropic.
2. **Describe something to make**, for example *"a coffee mug with a hexagon pattern"*.
3. **Rotate and zoom** the model in the 3D view.
4. **Ask for changes** in the same chat, for example *"make it 2 cm taller"*,
   *"add a hole for a cable"* or *"make the walls thinner"*. You can also tap one of the
   suggested follow-ups.
5. **Download** the model as:
   - **STL**, for 3D printing (millimetres)
   - **OBJ**, for Blender, CAD and most 3D apps
   - **GLB**, for the web, AR and games (keeps the colours)

Tap **New** to start a new design.

---

## Contents

- [Step 1: Get a Claude API key (all platforms)](#step-1-get-a-claude-api-key-all-platforms)
- [Step 2: Get the installers](#step-2-get-the-installers)
- [macOS: install from the .dmg](#macos-install-from-the-dmg)
- [Windows: install from the .msi or .exe](#windows-install-from-the-msi-or-exe)
- [Android: install the .apk](#android-install-the-apk)
- [iOS: install on iPhone or iPad](#ios-install-on-iphone-or-ipad)
- [Using the app](#using-the-app)
- [Troubleshooting](#troubleshooting)
- [For developers: build from source](#for-developers-build-from-source)

---

## Step 1: Get a Claude API key (all platforms)

1. Go to **https://console.anthropic.com** and sign in or create an account.
2. Open **Billing** and add credit. The API is pay-as-you-go, and each design or change
   usually costs a few cents.
3. Open **API Keys** and click **Create Key**. Name it something like `Shapesmith`.
4. **Copy the key** (it starts with `sk-ant-`). Keep it private, like a password.

You'll paste this key into Shapesmith the first time you open it.

---

## Step 2: Get the installers

The installers are built automatically by GitHub Actions. You do this once, and then
whenever you want a new version.

1. Open this repository on GitHub and click the **Actions** tab.
2. Click **Build apps** in the left sidebar.
3. Click **Run workflow** (on the right), then the green **Run workflow** button.
4. Wait for the run to finish with a green check mark. This takes about 15–25 minutes.
5. Click the finished run and scroll down to **Artifacts**. Download the one you need:

   | Artifact | Contains | For |
   |---|---|---|
   | `Shapesmith-aarch64-apple-darwin` | `Shapesmith_1.0.0_aarch64.dmg` | Macs with Apple Silicon (M1, M2, M3, M4 and later) |
   | `Shapesmith-x86_64-apple-darwin` | `Shapesmith_1.0.0_x64.dmg` | Macs with an Intel processor |
   | `Shapesmith-x86_64-pc-windows-msvc` | `.msi` and `-setup.exe` | Windows 10 and 11 |
   | `Shapesmith-android` | `Shapesmith.apk` | Android 7.0 and later |

6. Each artifact downloads as a `.zip`. Unzip it to get the installer.

> **Tip:** to publish a release that anyone can download, push a version tag
> (`git tag v1.0.0 && git push origin v1.0.0`). The workflow then creates a draft
> **Release** with all the installers attached. Open **Releases** on GitHub, check it and
> click **Publish**.

iOS apps can't be distributed this way. See the [iOS section](#ios-install-on-iphone-or-ipad).

---

## macOS: install from the .dmg

**Which Mac do I have?** Click the Apple menu  → **About This Mac**. If it says
**Chip: Apple M…**, use the `aarch64` .dmg. If it says **Processor: Intel**, use the
`x64` .dmg.

1. Double-click the `.dmg` file. A window opens with the Shapesmith icon and an
   **Applications** folder.
2. **Drag Shapesmith onto the Applications folder.**
3. Eject the disk image: right-click **Shapesmith** on the desktop or in the Finder
   sidebar and choose **Eject**.
4. Open **Applications** and double-click **Shapesmith**.
5. **The first time only**, macOS shows *"Shapesmith cannot be opened because Apple cannot
   check it for malicious software"* (or *"…is damaged"*). The app isn't harmful. macOS
   shows this for any app that hasn't been signed through Apple's paid developer program.
   To open it anyway:
   - **macOS 15 Sequoia and later:** click **Done**, open **System Settings → Privacy &
     Security**, scroll down to *"Shapesmith was blocked…"* and click **Open Anyway**.
     Enter your password, then click **Open Anyway** again.
   - **macOS 14 and earlier:** right-click (or Control-click) Shapesmith in Applications,
     choose **Open**, then click **Open** in the dialog.
   - **If it says the app "is damaged" or still won't open:** open **Terminal**
     (Applications → Utilities → Terminal), paste this whole line and press **Return**:

     ```bash
     pkill -9 -f "Shapesmith"; mkdir -p ~/Applications; rm -rf ~/Applications/Shapesmith.app; ditto --noextattr --noqtn /Applications/Shapesmith.app ~/Applications/Shapesmith.app && codesign --force --deep --sign - ~/Applications/Shapesmith.app && open ~/Applications/Shapesmith.app
     ```

     This closes Shapesmith if it's running, copies it to the **Applications** folder in your
     home folder without the download "quarantine" flag, re-signs it for this Mac, and opens
     it. From then on, open Shapesmith from **~/Applications** (in Finder: **Go → Home →
     Applications**). You can drag it to the Dock from there.
6. Paste your API key and click **Save key and start**. If macOS asks whether Shapesmith
   may use your Keychain, enter your Mac password and click **Always Allow**.

Your key is stored in the macOS **Keychain**, under *com.shapesmith.app*.

**Uninstall:** drag Shapesmith from Applications to the Trash. If you used the Terminal
command, also delete the copy in **~/Applications**.

---

## Windows: install from the .msi or .exe

Use either file. The `-setup.exe` is the simplest.

1. Double-click `Shapesmith_1.0.0_x64-setup.exe` (or the `.msi`).
2. If **Microsoft Defender SmartScreen** says *"Windows protected your PC"*, click
   **More info**, then **Run anyway**. This warning appears because the installer isn't
   code-signed with a paid certificate.
3. Follow the installer: click **Next** and then **Install**. If Windows asks whether to
   install the **WebView2** runtime, allow it (most Windows 10 and 11 PCs already have it).
4. Open **Shapesmith** from the Start menu.
5. Paste your API key and click **Save key and start**.

Your key is stored in **Windows Credential Manager**, under *com.shapesmith.app*.

**Uninstall:** Settings → Apps → Installed apps → Shapesmith → **Uninstall**.

---

## Android: install the .apk

1. Copy `Shapesmith.apk` to your phone, or download the artifact or release directly
   on your phone.
2. Tap the `.apk` file, for example in the **Files** app or from your browser's downloads.
3. If Android says *"For your security, your phone is not allowed to install unknown apps
   from this source"*, tap **Settings**, turn on **Allow from this source**, then go back.
4. Tap **Install**. If **Google Play Protect** shows a warning about an unknown developer,
   tap **More details → Install anyway**.
5. Open **Shapesmith** from your app drawer.
6. Paste your API key and tap **Save key and start**.

To download a model, tap **Download**, choose a format, and pick where to save it
(for example **Downloads**) in the file picker.

Your key is stored in Shapesmith's private app storage, which other apps can't read.

**Updating:** if you build without your own signing key (see
[Android signing](#optional-android-signing-key)), each build is signed with a new
temporary key. Uninstall the old version before installing a new one.

---

## iOS: install on iPhone or iPad

Apple only allows apps to be installed on an iPhone or iPad through Xcode, TestFlight
or the App Store, so iOS needs a Mac. A free Apple ID works for your own devices.

### What you need

- A Mac with **Xcode** (free from the Mac App Store; open it once to finish setup)
- An **Apple ID** (free), or a paid Apple Developer account ($99/year) for TestFlight
  or the App Store
- Your iPhone or iPad and a USB cable

### One-time Mac setup

Open **Terminal** and run these commands one at a time:

```bash
# 1. Xcode command line tools
xcode-select --install

# 2. Homebrew (package manager). Skip if you already have it: https://brew.sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 3. Node.js and CocoaPods
brew install node cocoapods

# 4. Rust, plus the iOS targets
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
```

### Build and install

1. Download this repository: on GitHub click **Code → Download ZIP** and unzip it, or run
   `git clone <repository URL>`.
2. In Terminal, go into the folder and install dependencies:
   ```bash
   cd 3D-DesignM
   npm install
   npm run tauri ios init
   ```
3. Open the generated Xcode project:
   ```bash
   open src-tauri/gen/apple/*.xcodeproj
   ```
4. In Xcode, click the project (blue icon) at the top of the left sidebar, select the
   target whose name ends in **_iOS**, then open **Signing & Capabilities**:
   - Tick **Automatically manage signing**.
   - **Team:** choose your Apple ID. To add it, click **Add an Account…**
     (Xcode → Settings → Accounts).
   - If Xcode says the bundle identifier is taken, change `com.shapesmith.app` to
     something unique, for example `com.yourname.shapesmith`.
5. Plug in your iPhone, unlock it, and tap **Trust** if asked.
6. On the iPhone, turn on **Developer Mode**: **Settings → Privacy & Security →
   Developer Mode → On**, then restart when asked. (This option appears after you
   connect the phone to Xcode.)
7. In Xcode's toolbar, choose your iPhone as the run destination and press **▶ Run**.
   The first build takes several minutes because it compiles the Rust code.
8. The first time, the iPhone says *"Untrusted Developer"*. Go to **Settings → General →
   VPN & Device Management**, tap your Apple ID, then **Trust**.
9. Open **Shapesmith**, paste your API key and tap **Save key and start**.

Downloaded models are saved where you choose. If no picker appears, they're in the
**Files** app → **On My iPhone → Shapesmith**. Your key is stored in the iOS **Keychain**.

> **Free Apple ID limitation:** apps installed with a free Apple ID stop opening after
> **7 days**. Connect the phone and press **▶ Run** in Xcode again to renew it. A paid
> Apple Developer account removes this limit and lets you share the app through
> **TestFlight** (Xcode: **Product → Archive → Distribute App → TestFlight**).

---

## Using the app

- **Describe clearly.** Include the object, its size and any details, for example
  *"a 12 cm tall vase with a twisted, narrow neck"*.
- **Refine step by step.** Follow-ups change the current design:
  - "Make it 20% wider"
  - "Add four 4 mm screw holes in the corners"
  - "Hollow it out with 2 mm walls"
  - "Change the colour to matte green"
- **Units are millimetres.** STL and OBJ files open at real-world size in slicers such as
  Bambu Studio, PrusaSlicer, Cura and Orca.
- **Stop** cancels a request that is taking too long.
- **API key settings** (the key icon, top right) lets you replace or remove your key.
- Designs aren't saved between sessions, so **download anything you want to keep**.

**Cost:** Shapesmith uses the Claude Opus 5.5 model (`claude-opus-5-5`). You pay Anthropic
directly for what you use. You can track spending and set limits in the Claude Console.

**Privacy:** your prompts and key go only to Anthropic's API (`api.anthropic.com`). There
is no Shapesmith server.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "That API key was rejected" | Copy the whole key again (it starts with `sk-ant-`), or create a new key in the Console. |
| "Your Anthropic account is out of credit" | Add credit in the Claude Console under **Billing**. |
| "Couldn't reach the Claude API" | Check your internet connection. Corporate networks may block `api.anthropic.com`. |
| "Rate limit reached" | Wait a minute and try again. |
| The model looks wrong | Ask for a fix in plain words ("the handle should touch the body"), or tap **New** and describe it again in more detail. |
| macOS says the app "is damaged" or won't open | Run the Terminal command in [macOS step 5](#macos-install-from-the-dmg), then open Shapesmith from `~/Applications`. |
| Windows says "Windows protected your PC" | Click **More info → Run anyway**. |
| Android won't install the update | Uninstall the old version first (it was signed with a different key). |
| iOS app stopped opening after a week | Free Apple ID limit. Reconnect the phone and press ▶ Run in Xcode again. |

---

## For developers: build from source

**Stack:** [Tauri 2](https://tauri.app) (Rust) with React, TypeScript and
[three.js](https://threejs.org). Claude calls go straight from the app to the Anthropic
API using the official `@anthropic-ai/sdk`.

```
src/
  App.tsx               app shell: API key gate, chat, download menu
  components/
    KeyScreen.tsx       API key entry and verification
    Viewer.tsx          three.js viewer (orbit, zoom, auto-framing)
  lib/
    claude.ts           Claude API calls: system prompt, streaming, error messages
    design.ts           design JSON schema and the code that builds 3D geometry from it
    exporters.ts        STL / OBJ / GLB export
    platform.ts         secure key storage and file saving (native or browser)
src-tauri/
  src/lib.rs            native commands: Keychain / Credential Manager / Android storage
  tauri.conf.json       app name, window, bundle (.dmg) settings
.github/workflows/build.yml   builds the .dmg, Windows installers and Android .apk
```

**How it works:** Claude returns a structured JSON design (enforced with structured
outputs). The design is a list of primitive parts (box, rounded box, sphere, cylinder,
cone, torus, capsule, extruded outline, lathe/revolved profile), each either *added* or
*subtracted*. The app builds them into a mesh, using CSG boolean operations for holes and
hollow shapes. Each follow-up sends the whole conversation, so Claude edits the current
design instead of starting over.

### Prerequisites

- Node.js 20 or later, and Rust (stable): https://rustup.rs
- Platform requirements: https://tauri.app/start/prerequisites/
  (Xcode on macOS, Visual Studio C++ Build Tools and WebView2 on Windows, Android Studio
  with the NDK for Android)

### Commands

```bash
npm install

npm run dev                  # UI only, in a normal browser at http://localhost:1420
npm run tauri dev            # desktop app with hot reload

npm run tauri build          # installers for the current OS
                             # macOS: src-tauri/target/release/bundle/dmg/*.dmg
                             # Windows: src-tauri/target/release/bundle/{msi,nsis}/

npm run tauri android init   # once
npm run tauri android dev    # run on a connected phone or emulator
npm run tauri android build -- --apk

npm run tauri ios init       # once, on a Mac
npm run tauri ios dev        # run on a simulator or connected device
```

A `.dmg` can only be built on a Mac, which is why the GitHub workflow uses macOS runners.

### Optional: Android signing key

To keep the same signature across updates, create a keystore once and add it as GitHub
repository secrets (**Settings → Secrets and variables → Actions**):

```bash
keytool -genkeypair -v -keystore shapesmith.jks -alias shapesmith -keyalg RSA -keysize 2048 -validity 10000
base64 -i shapesmith.jks | pbcopy   # macOS: copies it to the clipboard
```

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the base64 text |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `shapesmith` |

Keep `shapesmith.jks` and its password safe. Without them you can't publish updates that
install over the old version.

### Optional: signed and notarized macOS / Windows builds

To remove the first-launch warnings, sign the builds with an Apple Developer ID
certificate and a Windows code-signing certificate. See
https://tauri.app/distribute/sign/macos/ and https://tauri.app/distribute/sign/windows/,
then add the matching secrets to the `tauri-action` step in the workflow.
