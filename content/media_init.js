// This file is part of the Active Audit Chrome extensions
//
// This extension is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This extension is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this extension.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Javascript for preview window.
 *
 * We use the IIFE pattern. Chrome extensions currently don't support JS modules.
 * This way still gives us encapsulation and the client app doesn't have access to this.
 *
 * @copyright  2020 Matt Porritt <mattp@catalyst-au.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

window.console.log('media init script loaded at: ' + location.href);

// TODO: Pass in the constraints as a message from the background.
const constraints = {
        audio: false,
        video: true
      };

let msg = {
        sender: 'CONTENT',
        type: 'MEDIA_ACCESS',
        content: {
            status: 'OK',
            error: ''
        }
};

// Ask the user for access to their media devices.
navigator.mediaDevices.getUserMedia(constraints)
.then(function() {
    // On success return successful message.
    chrome.runtime.sendMessage(msg);
})
.catch(function(err) {
    // On fail send reason.
    msg.content.status = 'FAIL';
    msg.content.error = err;
    chrome.runtime.sendMessage(msg);
});