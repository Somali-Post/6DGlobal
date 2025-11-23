// /public/app/global-map.js

// 1. Import the API key
import { GOOGLE_MAPS_API_KEY } from './config.js';

// --- Global Variables ---
let map;
let geocoder;
let placesService;
let drawnObjects = [];
let gridLines = [];

// --- UTILITY & HELPER FUNCTIONS (Defined First) ---

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

async function handleMapClick(rawLatLng) {
    clearMapObjects();
    drawGridBoxes(rawLatLng);
    const snappedLatLng = snapToGridCenter(rawLatLng);
    const { formattedCode, localitySuffix } = getFormatted6DCode(snappedLatLng);
    const loadingAddress = { line1: 'Locating...', line2: '', line3: '' };
    updateInfoPanel(formattedCode, loadingAddress, '');
    const [geocodeResult, placeResult] = await Promise.all([
        getReverseGeocode(snappedLatLng),
        getPlaceDetails(snappedLatLng)
    ]);
    const finalAddress = parseAddressComponents(geocodeResult, placeResult);
    updateInfoPanel(formattedCode, finalAddress, localitySuffix);
}

function getReverseGeocode(latLng) {
    return new Promise((resolve) => {
        geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                resolve(results[0].address_components);
            } else {
                console.error('Geocoder failed due to: ' + status);
                resolve([]);
            }
        });
    });
}

function getPlaceDetails(latLng) {
    return new Promise((resolve) => {
        const request = { location: latLng, rankBy: google.maps.places.RankBy.DISTANCE, type: 'neighborhood' };
        const fallbackRequest = { location: latLng, rankBy: google.maps.places.RankBy.DISTANCE, type: 'sublocality' };
        placesService.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
                resolve(results[0]);
            } else {
                placesService.nearbySearch(fallbackRequest, (fallbackResults, fallbackStatus) => {
                    if (fallbackStatus === google.maps.places.PlacesServiceStatus.OK && fallbackResults[0]) {
                        resolve(fallbackResults[0]);
                    } else {
                        resolve(null);
                    }
                });
            }
        });
    });
}

function parseAddressComponents(geocodeComponents, placeResult) {
    const foundNames = [];
    const getComponent = (type) => {
        const component = geocodeComponents.find(c => c.types.includes(type));
        return component ? component.long_name : null;
    };
    if (placeResult && placeResult.name) {
        foundNames.push(placeResult.name);
    }
    const priorityList = ['locality', 'administrative_area_level_2', 'administrative_area_level_1', 'country'];
    for (const type of priorityList) {
        if (foundNames.length >= 3) break;
        const foundName = getComponent(type);
        if (foundName && !foundNames.includes(foundName)) {
            foundNames.push(foundName);
        }
    }
    if (foundNames.length === 0) {
        foundNames.push(getComponent('country') || 'Unknown Location');
    }
    return { line1: foundNames[0] || '', line2: foundNames[1] || '', line3: foundNames[2] || '' };
}

function updateInfoPanel(code, address, suffix) {
    const codeDisplay = document.getElementById('code-display');
    const line1Display = document.getElementById('line1-display');
    const line2Display = document.getElementById('line2-display');
    const line3Display = document.getElementById('line3-display');
    codeDisplay.innerHTML = `<span class="code-2d">${code.c2d}</span>-<span class="code-4d">${code.c4d}</span>-<span class="code-6d">${code.c6d}</span>`;
    line1Display.textContent = address.line1;
    line2Display.textContent = address.line2;
    const finalLine = `${address.line3} ${suffix}`.trim();
    line3Display.textContent = finalLine;
}

function updateDynamicGrid() {
    clearGridLines();
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    if (!bounds) return;
    const spacing = getGridSpacingForZoom(zoom);
    if (spacing === null) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const gridStyle = { strokeColor: '#000000', strokeOpacity: 0.2, strokeWeight: 0.5, clickable: false, zIndex: -1 };
    for (let lat = Math.floor(sw.lat() / spacing) * spacing; lat < ne.lat(); lat += spacing) {
        gridLines.push(new google.maps.Polyline({ ...gridStyle, path: [{ lat: lat, lng: sw.lng() }, { lat: lat, lng: ne.lng() }], map: map }));
    }
    for (let lng = Math.floor(sw.lng() / spacing) * spacing; lng < ne.lng(); lng += spacing) {
        gridLines.push(new google.maps.Polyline({ ...gridStyle, path: [{ lat: sw.lat(), lng: lng }, { lat: ne.lat(), lng: lng }], map: map }));
    }
}

function getGridSpacingForZoom(zoom) {
    if (zoom >= 17) return 0.0001;
    else if (zoom >= 13) return 0.01;
    else return null;
}

function clearGridLines() {
    gridLines.forEach(line => line.setMap(null));
    gridLines = [];
}

function snapToGridCenter(latLng) {
    const scale = 10000;
    const halfCell = 0.00005;
    const snappedLat = (Math.floor(latLng.lat() * scale) / scale) + halfCell;
    const snappedLng = (Math.floor(latLng.lng() * scale) / scale) + halfCell;
    return new google.maps.LatLng(snappedLat, snappedLng);
}

function generate6DCode(lat, lon) {
    const absLat = Math.abs(lat);
    const absLon = Math.abs(lon);
    const lat_d1 = Math.floor(absLat * 10) % 10;
    const lat_d2 = Math.floor(absLat * 100) % 10;
    const lat_d3 = Math.floor(absLat * 1000) % 10;
    const lat_d4 = Math.floor(absLat * 10000) % 10;
    const lon_d1 = Math.floor(absLon * 10) % 10;
    const lon_d2 = Math.floor(absLon * 100) % 10;
    const lon_d3 = Math.floor(absLon * 1000) % 10;
    const lon_d4 = Math.floor(absLon * 10000) % 10;
    const code6D = `${lat_d2}${lon_d2}-${lat_d3}${lon_d3}-${lat_d4}${lon_d4}`;
    const localitySuffix = `${lat_d1}${lon_d1}`;
    return { code6D, localitySuffix };
}

function getFormatted6DCode(latLng) {
    const { code6D, localitySuffix } = generate6DCode(latLng.lat(), latLng.lng());
    const parts = code6D.split('-');
    const formattedCode = { c2d: parts[0], c4d: parts[1], c6d: parts[2] };
    return { formattedCode, localitySuffix };
}

function drawGridBoxes(latLng) {
    const lat = latLng.lat();
    const lon = latLng.lng();
    const boxStyles = {
        '2d': { color: '#D32F2F', zIndex: 1, scale: 100,  fillOpacity: 0.0 },
        '4d': { color: '#388E3C', zIndex: 2, scale: 1000, fillOpacity: 0.0 },
        '6d': { color: '#1976D2', zIndex: 3, scale: 10000,fillOpacity: 0.15 }
    };
    for (const key in boxStyles) {
        const style = boxStyles[key];
        const scale = style.scale;
        const cellSize = 1 / scale;
        const swLat = Math.floor(lat * scale) / scale;
        const swLng = Math.floor(lon * scale) / scale;
        const bounds = { south: swLat, west: swLng, north: swLat + cellSize, east: swLng + cellSize };
        const rect = new google.maps.Rectangle({
            strokeColor: style.color,
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: style.color,
            fillOpacity: style.fillOpacity,
            map: map,
            bounds: bounds,
            zIndex: style.zIndex,
            clickable: false
        });
        drawnObjects.push(rect);
    }
}

function clearMapObjects() {
    for (let i = 0; i < drawnObjects.length; i++) {
        drawnObjects[i].setMap(null);
    }
    drawnObjects = [];
}

// --- ENTRY POINT FUNCTIONS (Defined Last) ---

function initMap() {
    const defaultLocation = { lat: 13.7563, lng: 100.5018 };
    geocoder = new google.maps.Geocoder();

    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 12,
        styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
        disableDefaultUI: true,
        zoomControl: true,
        draggableCursor: 'pointer',
        gestureHandling: 'greedy'
    });
    
    placesService = new google.maps.places.PlacesService(map);

    map.addListener('click', (event) => { handleMapClick(event.latLng); });
    const debouncedUpdateGrid = debounce(updateDynamicGrid, 250);
    map.addListener('idle', debouncedUpdateGrid);
    const geolocateBtn = document.getElementById('geolocate-btn');
    geolocateBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                    map.setCenter(userLatLng);
                    map.setZoom(18);
                    handleMapClick(userLatLng);
                },
                () => { alert("Error: The Geolocation service failed."); }
            );
        } else {
            alert("Error: Your browser doesn't support geolocation.");
        }
    });
    
    updateDynamicGrid();
}

function loadGoogleMapsAPI(apiKey) {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            return resolve();
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&v=weekly&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Google Maps script failed to load.'));
        document.head.appendChild(script);
    });
}

async function startApp() {
    // For local development, we use the key from config.js
    // For production, Netlify will replace the placeholder in this file.
    const apiKey = typeof GOOGLE_MAPS_API_KEY !== 'undefined' ? GOOGLE_MAPS_API_KEY : 'YOUR_API_KEY_HERE';
    
    if (apiKey === 'YOUR_API_KEY_HERE') {
        console.error("API Key is a placeholder. Please update config.js for local development.");
        document.body.innerHTML = '<h1>Error: API Key is missing.</h1>';
        return;
    }

    try {
        window.initMap = initMap; // Make initMap globally accessible
        await loadGoogleMapsAPI(apiKey);
    } catch (error) {
        console.error(error);
        document.body.innerHTML = '<h1>Error: Could not load Google Maps.</h1>';
    }
}

// --- SCRIPT EXECUTION ---
startApp();