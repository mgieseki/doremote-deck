## Doremote Deck
A Stream Deck plugin designed to send commands to Steinberg's music notation software Dorico via the
WebSocket-based Remote Control API. The plugin relies on the [Doremote](https://github.com/mgieseki/doremote)
shared library to handle the communication between the plugin and Dorico. Because the Doremote library is
currently only available as a Windows DLL, the plugin does not support macOS.

The plugin only provides the core button actions to communicate with Dorico. It does not include
pre-configured Stream Deck profiles, ready-to-use command collections, or button icons.

## Current Functionality
The plugin offers the following actions, which can be assigned to Stream Deck buttons.

#### Connect to Dorico
Starts and stops the connection to Dorico. While the initial connection requires confirmation via a dialog
prompt in Dorico, subsequent connections are automatic because the plugin reuses a stored session token.
If the *Automatically reconnect to Dorico* option is enabled in the button properties, the plugin will
attempt to reconnect in the background without requiring a button press. Once Dorico is running, the
connection is automatically established within a few seconds.

#### Send Command
Sends a specific command, like `Edit.ShowAccidental`, to Dorico. To my knowledge, there is currently no
official documentation for the available Dorico commands. However, you can use the demo applications included
with [Doremote](https://github.com/mgieseki/doremote) to browse and test the commands retrieved through
the API.

Dorico's macro recording feature, accessible via the *Script* menu, is another great way to get familiar
with the syntax. The generated Lua script contains all the necessary commands to reproduce your recorded
actions. Please note that the available command set may vary depending on your Dorico version and edition
(SE, Elements, Pro).

In the button settings, enter the command and its parameters into the designated text field. Parameters are
appended after a question mark (`?`) in any order and must be separated by commas (`,`) or ampersands (`&`),
with no spaces in between. For example:

```
UI.InvokePropertyChangeValue?Type=kNoteAccidentalVisibility_v3,Value=kRoundBrackets
```

#### Send Multiple Commands
Similar to the previous action, this one allows you to send a sequence of multiple commands to Dorico.
Commands are entered into the property inspector's text area and must be separated by semicolons and/or
newlines. If Dorico returns an error for any command in the sequence, execution stops immediately, and the
remaining commands are not sent.

## Build Requirements
To build the plugin from the sources, [Node.js](https://nodejs.org) and
the [Stream Deck SDK](https://docs.elgato.com/streamdeck/sdk/introduction/getting-started) must be installed.
Additionally, Microsoft Visual Studio (the free Community Edition is sufficient) is required to compile the
*Doremote* Node.js bindings.

## Build Instructions
- Clone this repository.
- Download the latest pre-built `doremote.dll` from [here](https://github.com/mgieseki/doremote) and copy it
to directory `doremote-deck/native`.
- Install the dependencies and build the plugin:
    ```cmd
    cd doremote-deck
    npm install
    npm run build
    streamdeck link com.mgieseking.doremote-deck.sdPlugin
    ```

## Disclaimer
Dorico is a registered trademark of Steinberg Media Technologies GmbH in the European Union, United States of
America, and other countries, used with permission. This project is not affiliated with Steinberg Media
Technologies GmbH in any way.