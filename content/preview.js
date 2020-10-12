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

// eslint-disable-next-line no-unused-vars
const Preview = (() => {
    PreviewObj = {};

    // Module level variables.
    let previewContainer;
    let shiftX = 0;
    let shiftY = 0;

    /**
     * Get the highest z index used on the page.
     *
     * @return {integer} maxZ The highest z index on the page.
     */
    const getMaxZ = () => {
        const maxZ = Array.from(document.querySelectorAll('body *'))
            .map((a) => parseFloat(window.getComputedStyle(a).zIndex))
            .filter((a) => !isNaN(a))
            .sort((a, b) => a - b)
            .pop();

        return maxZ;
    };

    /**
     * Moves the previewContainer at (pageX, pageY) coordinates taking initial shifts into account.
     *
     * @param {integer} pageX X position.
     * @param {integer} pageY Y position.
     * @method moveAt
     */
    const moveAt = (pageX, pageY) => {
        previewContainer.style.left = pageX - shiftX + 'px';
        previewContainer.style.top = pageY - shiftY + 'px';
    };

    /**
     * Preview container mouse move event handler.
     *
     * @param {event} event The move event.
     * @method previewContainerOnmousemove
     */
    const previewContainerOnmousemove = (event) => {
        moveAt(event.pageX, event.pageY);
    };

    /**
     * Preview container mouse down event handler.
     *
     * @param {event} event The down event.
     * @method previewContainerOnmousedown
     */
    const previewContainerOnmousedown = (event) => {
        shiftX = event.clientX - previewContainer.getBoundingClientRect().left;
        shiftY = event.clientY - previewContainer.getBoundingClientRect().top;

        // Move container out of any current parents and directly into the body,
        // to make it positioned relative to the body.
        document.body.append(previewContainer);

        // Set a higher z index than everything else on the page.
        previewContainer.style.zIndex = getMaxZ() + 10;

        moveAt(event.pageX, event.pageY);

        // Move the previewContainer on mousemove.
        // Do this only during the context of a mouse down event.
        document.addEventListener('mousemove', previewContainerOnmousemove);
    };

    /**
     * Preview container drag start event handler.
     *
     * @param {event} event The drag start event.
     * @method previewContainerOndragstart
     * @return {bool}
     */
    const previewContainerOndragstart = (event) => {
        event.preventDefault();
        return false;
    };

    /**
     * Create the preview window container and markup.
     *
     * @method createpreview
     */
    PreviewObj.createpreview = () => {
        previewContainer = document.createElement('div');
        previewContainer.id = 'activeaudit-preview-container';
        const previewContainerHeader = document.createElement('div');
        previewContainerHeader.id = 'activeaudit-preview-container-header';

        previewContainer.appendChild(previewContainerHeader);

        // Add initial event listeners.
        previewContainer.addEventListener('mousedown', previewContainerOnmousedown);
        previewContainer.addEventListener('dragstart', previewContainerOndragstart);
        previewContainer.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', previewContainerOnmousemove); // Remove unneeded handlers.
        });
    };

    /**
     * Add the preview window to the DOM and make it available.
     *
     * @method showpreview
     */
    PreviewObj.showpreview = () => {
        document.body.append(previewContainer);
    };

    // Return the "public" methods.
    return PreviewObj;
})();
