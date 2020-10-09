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
 * Javascript for client side operations.
 *
 * @copyright  2020 Matt Porritt <mattp@catalyst-au.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

window.console.log('extenstion active audit loaded');

const showPreview = () => {

    // Send message to background, to update state.
    let msg = {
            sender: 'CONTENT',
            type: 'ACTION',
            content: 'SHOW_PREVIEW'
    };

    chrome.runtime.sendMessage(msg);

    // Show the preview element.
    Preview.showpreview();
};

const clientMessageReceive = (message) => {

    if (message.content === 'SHOW_PREVIEW') {
        showPreview();
    }

};

/**
 * Handle received messages.
 *
 * @method messagelistener
 * @param {event} event The event object from the event listener.
 */
const messagelistener = (event) => {
    if (event.origin !== window.origin) { // Only respond to messages from our own origin.
        return;
    }

    if (event.data.sender === 'CLIENT') {
        clientMessageReceive(event.data);
    }
};

// Add event listener for message passed from client and background scripts.
window.addEventListener('message', messagelistener);

// Create an HTML element that will hold the webcam preview window.
Preview.createpreview();
