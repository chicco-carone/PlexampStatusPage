// scripts/ui.js

import { getCurrentTheme, applyTheme, setCurrentTheme } from './themes.js';
import { getPlexCredentials, savePlexCredentials, formatTime, getTimeFormat, setTimeFormat } from './utils.js';
import { state } from './state.js';
import { fetchNowPlaying } from './api.js';

const clockElement = document.getElementById('clock');
const progressElement = document.getElementById('progress');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
const trackTitleElement = document.getElementById('track-title');
const trackArtistElement = document.getElementById('track-artist');
const trackAlbumElement = document.getElementById('track-album');
const albumArtElement = document.getElementById('album-art');

const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.getElementById('close-modal');
const saveSettingsButton = document.getElementById('save-settings');
const plexIPInput = document.getElementById('plex-ip');
const plexTokenInput = document.getElementById('plex-token');
const themeSelect = document.getElementById('theme-select');
const timeFormatSelect = document.getElementById('time-format');

export function initializeUI() {
    // Event listeners for settings modal
    settingsButton.addEventListener('click', openSettingsModal);
    closeModal.addEventListener('click', closeSettingsModal);
    window.addEventListener('click', outsideClick);
    saveSettingsButton.addEventListener('click', saveSettings);

    // Start the progress bar updater
    setInterval(updateProgressBar, 200); // Update every 200ms
}

export function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');

    const timeFormat = getTimeFormat();
    if (timeFormat === '24h') {
        clockElement.innerText = `${hours.toString().padStart(2, '0')}:${minutes}`;
    } else {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        clockElement.innerText = `${displayHours}:${minutes} ${ampm}`;
    }
}

function updateProgressBar() {
    if (state.isPlaying) {
        const now = Date.now();
        const elapsedTime = now - state.lastUpdate;
        state.currentOffset += elapsedTime;
        state.lastUpdate = now;

        const adjustedOffset = Math.min(state.currentOffset, state.totalDuration);

        const progressPercentage = (adjustedOffset / state.totalDuration) * 100;
        progressElement.style.width = progressPercentage + '%';
        currentTimeElement.innerText = formatTime(adjustedOffset);

        if (adjustedOffset >= state.totalDuration) {
            state.isPlaying = false;
            resetNowPlaying();
        }
    }
}

export function updateNowPlayingUI(mediaInfo) {
    const { mediaId, title, artist, album, albumYear, coverUrl, plexIP, plexToken, viewOffset, duration } = mediaInfo;
    const imageUrl = `http://${plexIP}:32400${coverUrl}?X-Plex-Token=${plexToken}`;

    trackTitleElement.innerText = title;
    trackArtistElement.innerText = artist;
    trackAlbumElement.innerText = albumYear ? `${album} (${albumYear})` : album;
    albumArtElement.crossOrigin = 'Anonymous'; // Important for CORS
    albumArtElement.src = imageUrl;

    // Apply dynamic themes
    const theme = getCurrentTheme();
    if (theme === 'pastel' || theme === 'glass') {
        albumArtElement.onload = () => {
            applyTheme(theme, albumArtElement);
        };
    } else {
        clearDynamicBackground();
    }

    // Update total time
    totalTimeElement.innerText = formatTime(duration);

    // Sync progress only if media has changed or client is behind server by more than 2 seconds
    const drift = viewOffset - state.currentOffset;
    if (state.lastMediaId !== mediaId || drift > 2000) {
        state.lastMediaId = mediaId;
        state.currentOffset = viewOffset;
        state.totalDuration = duration;
        state.lastUpdate = Date.now();
    } else {
        // Do not adjust if the server's viewOffset is behind or within 2 seconds ahead
        // This prevents the progress bar from skipping back
    }

    state.isPlaying = true;
}

export function resetNowPlaying() {
    trackTitleElement.innerText = 'Nothing is currently playing.';
    trackArtistElement.innerText = '';
    trackAlbumElement.innerText = '';
    albumArtElement.src = 'https://avatars.githubusercontent.com/u/43970498'; // Default image
    progressElement.style.width = '0%';
    currentTimeElement.innerText = '0:00';
    totalTimeElement.innerText = '0:00';
    state.isPlaying = false;

    // Reset background for dynamic themes
    clearDynamicBackground();
}

// Settings Modal Functions
function openSettingsModal() {
    settingsModal.style.display = 'block';
    // Populate inputs with current values
    const { plexToken, plexIP } = getPlexCredentials();
    plexIPInput.value = plexIP || '';
    plexTokenInput.value = plexToken || '';
    themeSelect.value = getCurrentTheme();
    timeFormatSelect.value = getTimeFormat();

    // Apply theme to modal
    settingsModal.className = `modal ${getCurrentTheme()}`;
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
}

function outsideClick(event) {
    if (event.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
}

function saveSettings() {
    const plexIP = plexIPInput.value.trim();
    const plexToken = plexTokenInput.value.trim();
    const selectedTheme = themeSelect.value;
    const selectedTimeFormat = timeFormatSelect.value;

    if (plexIP && plexToken) {
        savePlexCredentials(plexToken, plexIP);
    }

    setCurrentTheme(selectedTheme);
    applyTheme(selectedTheme);

    setTimeFormat(selectedTimeFormat);
    updateClock();

    settingsModal.style.display = 'none';
    fetchNowPlaying(); // Refresh now playing info
}

function clearDynamicBackground() {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundColor = '';
    document.body.classList.remove('glass-theme', 'pastel-theme');
    document.documentElement.style.removeProperty('--pastel-color');
}
