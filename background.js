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

let pc = null;

/**
 * Return the current state of the preview window and send a message to content space with the state.
 * Used to determine if we should load the preview window on page load.
 *
 * @method checkPreview.
 */
const checkPreview = () => {

    if (showPreviewStatus) {
        console.log('we have an existing preview');
        setupContentRTC(mediaStream);
    }
};

const rtcDone = () => {
    showPreviewStatus = true;
};

const onIceCandidateSend = async(event) => {
    let msg = {
            sender: 'BACKGROUND',
            type: 'ICE_CANDIDATE_SEND',
            content: event.candidate
    };
    contentMessageSend(msg);
};

const onIceCandidateRecv = (candidate) => {
    if (candidate) {
        pc.addIceCandidate(candidate);
    }
};

const setupContentRTC = async(stream) => {
    const offerOptions = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1
    };

    if (!pc){
        pc = new RTCPeerConnection(); // Empty ICE server object as it is a "local" connection.
        pc.addStream(stream); // Add the stream to the peer connection object.
        pc.addEventListener('icecandidate', onIceCandidateSend);
        pc.addEventListener('iceconnectionstatechange', () => {
            console.log('ice state change', pc.iceConnectionState);
            if (pc.iceConnectionState == 'disconnected') {
                console.log('trying reconnect');
                setupContentRTC(mediaStream);
            }
        });
    } else {
        offerOptions.iceRestart = true;
    }

    try {
        // Create the offer and update the local description.
        const offer = await pc.createOffer(offerOptions);
        await pc.setLocalDescription(offer);

        // Send a message to the content with the local description.
        let msg = {
                sender: 'BACKGROUND',
                type: 'RTC_SEND_OFFER',
                content: pc.localDescription
        };
        contentMessageSend(msg);
    } catch (error) {
        console.log('Failed to create session description: ' + error.toString());
    }
};

const rtcReceiveOffer = (message) => {
    pc.setRemoteDescription(new RTCSessionDescription(message));
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
        // Send good to go message to content space.
        response(responseMsg);
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
            // We have accessed the users media device and they are now active.
            // We now need to set up some RTC Peer connections to share the media with.
            // First we send the media to the client so they can see themselves.
            // Next we send the video to the remote server for recording and monitoring.

            // Setup and send the video stream to content.
            setupContentRTC(response.stream);

            // TODO: send media to the server.

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
        'MEDIA_ACCESS': mediaAccess,
        'RTC_SEND_OFFER': rtcReceiveOffer,
        'ICE_CANDIDATE_SEND': onIceCandidateRecv,
        'RTC_DONE': rtcDone
};

// Add event listener for messages from content scripts.
chrome.runtime.onMessage.addListener(contentMessageReceive);
