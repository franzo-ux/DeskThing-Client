# DeskThing Client — franzo-ux fork

Fork of [ItsRiprod/DeskThing-Client](https://github.com/ItsRiprod/DeskThing-Client) 0.11.2
(the UI that runs on the Spotify Car Thing), version **0.11.3**. Changes:

- **Knob wheel sized to the apps**: one slot per installed app, from 4 up to 8, on a ring that turns
  around the knob (same centre as the original wheel). The first four slots keep the `Wheel1`–`Wheel4`
  mappings, the others open the next apps of the list. The selected app's name is shown beside it.
  (`src/overlay/SelectionWheel.tsx`)
- **Buttons and knob press never get stuck**: they are keyboard events, and after a tap inside an app
  its iframe kept the focus, so DeskThing stopped receiving them. The client now takes the focus back.
  (`src/main.tsx`)

## Build

```bash
npm install
npx vite build --base=./      # -> dist/   (the upstream `tsc` step fails on existing code, skip it)
```

## Install on the Car Thing (over adb)

The UI lives in `/usr/share/qt-superbird-app/webapp` on a read-only root filesystem. Keep a copy of
the original first, keep the device's own `manifest.json`/`manifest.js` (they hold the connection
settings), then replace `assets/` and `index.html`:

```bash
adb shell 'cp -a /usr/share/qt-superbird-app/webapp /var/webapp-orig'   # once: backup
adb push dist/assets dist/index.html /var/dtc-new/
adb shell 'mount -o remount,rw / && W=/usr/share/qt-superbird-app/webapp \
  && rm -rf $W/assets && cp -a /var/dtc-new/assets $W/ && cp /var/dtc-new/index.html $W/ \
  && sync; mount -o remount,ro /; rm -rf /var/dtc-new'
```

Also copy `dist/assets` and `dist/index.html` into `%APPDATA%\deskthing\webapp` on the PC, so that
DeskThing pushes this version if it ever re-installs the client.

To go back: copy `/var/webapp-orig` back the same way.
