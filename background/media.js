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
 * Javascript for media operations.
 *
 * We use the IIFE pattern. Chrome extensions currently don't support JS modules.
 * This way still gives us encapsulation and the client app doesn't have access to this.
 *
 * @copyright  2020 Matt Porritt <mattp@catalyst-au.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// eslint-disable-next-line no-unused-vars
const Media = (() => {
    MediaObj = {};

    // Module level variables.
    const constraints = {
            audio: false,
            video: true,
            IceRestart: true
          };

    function handleSuccess(stream) {
        const videoTracks = stream.getVideoTracks();
        console.log('Got stream with constraints:', constraints);
        console.log(`Using video device: ${videoTracks[0].label}`);
      }

    /**
     * Initialise media sharing.
     *
     * @method init
     */
    MediaObj.init = async () => {
        console.log('initialising media');

        let response = {
                status: 'OK',
                stream: null
        };

        try {
            response.stream = await navigator.mediaDevices.getUserMedia(constraints);
          /* use the stream */
          return response;
        } catch(err) {
            if (err.name === 'NotAllowedError') {
                response.status = 'NotAllowedError';
            } else {
                response.status = 'FAIL';
                console.log(err);
            }

            return response;
        }
    };

    // Return the "public" methods.
    return MediaObj;
})();
