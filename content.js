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

window.console.log('extension active audit loaded');

let pc = null;

const rtcTrackListener = (event) => {
    window.console.log('track event listener fired');
    Preview.showpreview(event.streams[0]);

    // Tell the backend we have everything.
    let msg = {
            sender: 'CONTENT',
            type: 'RTC_DONE',
            content: 'RTC_DONE'
    };

    chrome.runtime.sendMessage(msg);
};

const rtcSetup = () => {

    if (!pc) {
        pc = new RTCPeerConnection();
        pc.addEventListener('icecandidate', onIceCandidateSend);
        pc.addEventListener('track', rtcTrackListener); // Event listener for when we get a track.
    }
};

/**
 * Start the processing to show the preview video window on the page.
 * This method is triggered from a message sent from the client.
 *
 * The processing involves messaging the backend and is the start point for
 * getting access to the users media devices.
 *
 * @method processPreview.
 */
const processPreview = () => {
    // Send message to background, to update state and to start the media sharing process
    let msg = {
            sender: 'CONTENT',
            type: 'PROCESS_PREVIEW',
            content: true
    };

    // We don't have a message callback here.
    // The background will send an explicit message in response (it has to do some stuff).
    chrome.runtime.sendMessage(msg);
};

/**
 * Check the desired display status of the preview window from the background.
 * If response is true display the preview window on the page.
 *
 * @method previewCheckDisplay
 */
const previewCheckDisplay = () => {
    let msg = {
            sender: 'CONTENT',
            type: 'CHECK_PREVIEW',
            content: 'CHECK_PREVIEW'
    };

    chrome.runtime.sendMessage(msg);
}

const onIceCandidateSend = async(event) => {
    let msg = {
            sender: 'CONTENT',
            type: 'ICE_CANDIDATE_SEND',
            content: event.candidate
    };
    chrome.runtime.sendMessage(msg);
};

const onIceCandidateRecv = (candidate) => {
    if (candidate) {
        pc.addIceCandidate(candidate);
    }
};

const rtcReceiveOffer = async(message) => {
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(message));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        let msg = {
                sender: 'CONTENT',
                type: 'RTC_SEND_OFFER',
                content: pc.localDescription
        };

        chrome.runtime.sendMessage(msg);

      } catch (error) {
          window.console.log('Failed to create session description: ' + error.toString());
      }

};

const mediaFail = (message) => {
    window.console.log(message)
};

/**
 * Handle received background messages.
 *
 * @method backgroundMessageReceive
 * @param {object} message The message object from the event listener.
 * @param {object} sender The sender object from the event listener.
 */
const backgroundMessageReceive = (message, sender) => {
    if (message.sender !== 'BACKGROUND') {
        return;
    }

    // Call the appropriate method based on the message type.
    const method = backgroundMessageActions[message.type];
    method(message.content);
};

/**
 * Handle received client messages.
 *
 * @method clientMessageReceive
 * @param {event} event The event object from the event listener.
 */
const clientMessageReceive = (event) => {
    if (event.origin !== window.origin) { // Only respond to messages from our own origin.
        return;
    } else if (event.data.sender !== 'CLIENT') { // Only action specific client messages.
        return;
    }

    // Call the appropriate method based on the message type.
    const method = clientMessageActions[event.data.type];
    method(event.data.content);
};

//Mapping of received background message actions to methods that implement the actions.
const backgroundMessageActions = {
        'MEDIA_FAIL': mediaFail,
        'RTC_SEND_OFFER': rtcReceiveOffer,
        'ICE_CANDIDATE_SEND': onIceCandidateRecv
};

//Mapping of received client message actions to methods that implement the actions.
const clientMessageActions = {
        'SHOW_PREVIEW': processPreview
};

// Add event listener for message passed from client scripts.
window.addEventListener('message', clientMessageReceive);

// Add event listener for message passed from background scripts.
chrome.runtime.onMessage.addListener(backgroundMessageReceive);

//  Do initila RTC setup tasks.
rtcSetup();

// Create an HTML element that will hold the webcam preview window.
Preview.createpreview();

// Check if we need to display the preview window.
previewCheckDisplay();
