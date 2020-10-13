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

/**
 * Try to get access to the users media devices.
 * Returns a promise that resolves on success and rejects on failure.
 *
 * @method getMedia
 * @return {Promise}
 */
const getMedia = () => {
    return new Promise((resolve, reject) => {
        // Start the workflow to get access to the users webcam etc.
        Media.init()
        .then((media) => {
             if (media.status == 'OK') {
                 // Set the media stream to the module level.
                 mediaStream = media.stream;
                 resolve(media);
            } else {
                reject(media);
            }
        });
    });
};

/**
 * Start the processing to show the preview window.
 * This method handles getting access to the users media.
 *
 * @method processPreview.
 */
const processPreview = (content) => {
    // Try to get access to the users media devices.
    getMedia()
    .then((response) => {
        response(responseMsg);
        // Send good to go message to content space.
    })
    .catch((response) => {
        if (response.status = 'NotAllowedError') {
            // Background scripts can only access a users media devices if they have already have been granted access.
            // However, background scripts cannot ask for this permission.
            // So we need to create a content script that exists on the same "domain" (chrome://extensions/)
            // as the background. Then this script can ask for permission. Once this content script has permission,
            // the background can then re-ask for permission as the "domain" has already been given access.
            // Yes, this is confusing and silly.

            // To do this we programatically make a frame and add it to the clients page.
            // This page will then ask for permission to access the users media devices.
            // Then the pages javascript will send a message back to us here in the background space with its result.
            const iframecode = "ifr = document.createElement('iframe');" +
            "ifr.setAttribute('allow', 'microphone; camera');" +
            "ifr.style.display = 'none';" +
            "ifr.src = chrome.runtime.getURL('assets/mediaaccess.html');" +
            "document.body.appendChild(ifr);";
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.executeScript(tabs[0].id, {code: iframecode});
            });
        } else {
            // We have a fail we can't recover from. Let the content script know.
            let msg = {
                    sender: 'BACKGROUND',
                    type: 'MEDIA_FAIL',
                    content: response
            };
            contentMessageSend(msg);
        }

    });
};

/**
 * Handle the response from the content script that asks users for access to their media devices.
 * Send appropratite messages back to the main content script with the response.
 *
 * @method mediaAccess
 */
const mediaAccess = (content) => {
    if (content.status == 'OK') {
        // We should now have permission to the users media devices.
        // Lets try to access them.
        getMedia()
        .then((response) => {
            console.log(response);
            // Send good to go message to content space.
            let msg = {
                    sender: 'BACKGROUND',
                    type: 'MEDIA_SUCCESS',
                    content: response
            };
            contentMessageSend(msg);
        })
        .catch((response) => {
            // We have a fail we can't recover from. Let the content script know.
            let msg = {
                    sender: 'BACKGROUND',
                    type: 'MEDIA_FAIL',
                    content: response
            };
            contentMessageSend(msg);
        });

    } else {
        // We have a fail we can't recover from. Let the content script know.
        let msg = {
                sender: 'BACKGROUND',
                type: 'MEDIA_FAIL',
                content: content
        };
        contentMessageSend(msg);
    }
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
        'PROCESS_PREVIEW': processPreview,
        'MEDIA_ACCESS': mediaAccess
};

// Add event listener for messages from content scripts.
chrome.runtime.onMessage.addListener(contentMessageReceive);
