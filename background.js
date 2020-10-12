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
 * Javascript for background operations.
 *
 * @copyright  2020 Matt Porritt <mattp@catalyst-au.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Track the status of the preview window.
let showPreviewStatus = false;

// Media stream.
let mediaStream = false;

/**
 * Return the current state of the preview window and send a message to content space with the state.
 * Used to determine if we should load the preview window on page load.
 *
 * @method checkPreview.
 */
const checkPreview = (content, response) => {

    const responseMsg = {
            status: showPreviewStatus,
            stream: mediaStream
    };

    response(responseMsg);
};

const getMedia = (content, response) => {
    let responseMsg = {
            status: null,
            stream: null
    };

    // Start the workflow to get access to the users webcam etc.
    Media.init()
    .then((media) => {
         if (media.status == 'NotAllowedError') {
            responseMsg.status = 'NotAllowedError';

        } else {
            // Assume things are good.
            mediaStream = media.stream;
            responseMsg.status = 'OK';
            responseMsg.stream = media.stream;
        }

        response(responseMsg);
    });
}

/**
 * Set the preview status to true.
 *
 * @method showPreview.
 */
const showPreview = (content, response) => {
    let responseMsg = {
            status: null,
            stream: null
    };

    // Start the workflow to get access to the users webcam etc.
    Media.init()
    .then((media) => {
         if (media.status == 'NotAllowedError') {
            responseMsg.status = 'NotAllowedError';

        } else {
            // Assume things are good.
            mediaStream = media.stream;
            responseMsg.status = 'OK';
            responseMsg.stream = media.stream;
        }

        response(responseMsg);
    });
};


/**
 * Send message to the content script.
 *
 * @method contentMessageSend
 * @param {object} message The messge to send.
 */
const contentMessageSend = (message) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message);
    });
};

/**
 * Handle messages sent from the content script.
 *
 * @method contentMessageReceive
 * @param {object} message The message object from the event listener.
 * @param {object} sender The sender object from the event listener.
 */
const contentMessageReceive = (message, sender, response) => {
    if (message.sender !== 'CONTENT') {
        return;
    }

    // Call the appropriate method based on the message type.
    const method = messageActions[message.type];
    method(message.content, response);

    return true;
};

// Mapping of received message actions to methods that implement the actions.
const messageActions = {
        'CHECK_PREVIEW': checkPreview,
        'SHOW_PREVIEW': showPreview,
        'GET_MEDIA': getMedia
};

// Add event listener for messages from content scripts.
chrome.runtime.onMessage.addListener(contentMessageReceive);
