/**
 * Vinyl Player - Reproductor de musica estilo tocadiscos
 * Diseno inspirado en Apple - Minimalista y refinado
 */

// ============================================
// AudioPlayer - Control de reproduccion de audio
// ============================================
class AudioPlayer {
    constructor() {
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentTrack = null;
        this.volume = 0.8;
        this.speed = 1;

        this.audio.volume = this.volume;
        this.audio.preload = 'metadata';
        this.audio.playbackRate = this.speed;

        this._setupEventListeners();

        this.onPlay = null;
        this.onPause = null;
        this.onStop = null;
        this.onTimeUpdate = null;
        this.onLoadedMetadata = null;
        this.onEnded = null;
        this.onError = null;
        this.onLoading = null;
        this.onSpeedChange = null;
    }

    _setupEventListeners() {
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            if (this.onPlay) this.onPlay();
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            if (this.onPause) this.onPause();
        });

        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            if (this.onEnded) this.onEnded();
        });

        this.audio.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) {
                this.onTimeUpdate({
                    currentTime: this.audio.currentTime,
                    duration: this.audio.duration,
                    progress: this.getProgress()
                });
            }
        });

        this.audio.addEventListener('loadedmetadata', () => {
            if (this.onLoadedMetadata) {
                this.onLoadedMetadata({ duration: this.audio.duration });
            }
        });

        this.audio.addEventListener('waiting', () => {
            if (this.onLoading) this.onLoading(true);
        });

        this.audio.addEventListener('canplay', () => {
            if (this.onLoading) this.onLoading(false);
        });

        this.audio.addEventListener('error', (e) => {
            this.isPlaying = false;
            if (this.onError) {
                this.onError(this._getErrorMessage(e));
            }
        });
    }

    _getErrorMessage(e) {
        const error = this.audio.error;
        if (!error) return 'Error desconocido';
        switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED: return 'Reproduccion abortada';
            case MediaError.MEDIA_ERR_NETWORK: return 'Error de red';
            case MediaError.MEDIA_ERR_DECODE: return 'Error al decodificar';
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: return 'Formato no soportado';
            default: return 'Error desconocido';
        }
    }

    load(src, trackInfo = {}) {
        this.currentTrack = {
            src,
            title: trackInfo.title || 'Sin titulo',
            artist: trackInfo.artist || 'Artista desconocido',
            ...trackInfo
        };
        this.audio.src = src;
        this.audio.load();
    }

    async play() {
        if (!this.audio.src) return;
        try {
            await this.audio.play();
        } catch (error) {
            console.error('Error al reproducir:', error);
            if (this.onError) this.onError(error.message);
        }
    }

    pause() { this.audio.pause(); }

    togglePlay() {
        if (this.isPlaying) this.pause();
        else this.play();
    }

    stop() {
        this.pause();
        this.audio.currentTime = 0;
        if (this.onStop) this.onStop();
    }

    seek(time) {
        if (isNaN(this.audio.duration)) return;
        this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
    }

    seekToPercent(percent) {
        if (isNaN(this.audio.duration)) return;
        this.seek((percent / 100) * this.audio.duration);
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audio.volume = this.volume;
    }

    setVolumePercent(percent) { this.setVolume(percent / 100); }

    setSpeed(speed) {
        this.speed = Math.max(0.25, Math.min(4, speed));
        this.audio.playbackRate = this.speed;
        if (this.onSpeedChange) this.onSpeedChange(this.speed);
    }

    getSpeed() { return this.speed; }
    getCurrentTime() { return this.audio.currentTime; }
    getDuration() { return this.audio.duration || 0; }

    getProgress() {
        if (!this.audio.duration || isNaN(this.audio.duration)) return 0;
        return (this.audio.currentTime / this.audio.duration) * 100;
    }

    static formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    getCurrentTrack() { return this.currentTrack; }
    hasTrack() { return !!this.audio.src; }
}

// ============================================
// TurntableUI - Animaciones del tocadiscos
// ============================================
class TurntableUI {
    constructor() {
        this.vinyl = document.getElementById('vinyl');
        this.tonearm = document.getElementById('tonearm');
        this.powerLight = document.getElementById('powerLight');
        this.labelTitle = document.getElementById('labelTitle');
        this.labelArtist = document.getElementById('labelArtist');

        this.isSpinning = false;
        this.armPosition = 0;
        this.currentSpeed = 1;

        // Angulos del brazo
        this.ARM_REST_ANGLE = 45;
        this.ARM_START_ANGLE = 5;
        this.ARM_END_ANGLE = -20;

        this._moveArmToRest();
    }

    play() {
        this.powerLight.classList.add('on', 'playing');
        this.powerLight.classList.remove('loading');
        this._moveArmToRecord();
        setTimeout(() => this._startSpinning(), 800);
    }

    pause() {
        this._stopSpinning();
        this.powerLight.classList.remove('playing');
    }

    stop() {
        this._stopSpinning();
        this._moveArmToRest();
        this.powerLight.classList.remove('on', 'playing');
        this.armPosition = 0;
    }

    updateArmPosition(progress) {
        if (!this.isSpinning) return;
        this.armPosition = progress;
        const angle = this.ARM_START_ANGLE + (progress / 100) * (this.ARM_END_ANGLE - this.ARM_START_ANGLE);
        this.tonearm.style.transform = `rotate(${angle}deg)`;
    }

    updateLabel(title, artist) {
        this.labelTitle.textContent = title || 'Sin cancion';
        this.labelArtist.textContent = artist || '---';
    }

    updateSpeed(speed) {
        this.currentSpeed = speed;
        // Remover todas las clases de velocidad
        this.vinyl.classList.remove(
            'speed-0-5x', 'speed-0-75x', 'speed-1x',
            'speed-1-25x', 'speed-1-5x', 'speed-2x'
        );
        // Anadir la clase correspondiente
        const speedClass = `speed-${speed.toString().replace('.', '-')}x`;
        this.vinyl.classList.add(speedClass);
    }

    showLoading() {
        this.powerLight.classList.add('loading');
        this.powerLight.classList.remove('on', 'playing');
    }

    hideLoading() {
        this.powerLight.classList.remove('loading');
    }

    _startSpinning() {
        this.vinyl.classList.add('spinning');
        this.isSpinning = true;
    }

    _stopSpinning() {
        this.vinyl.classList.remove('spinning');
        this.isSpinning = false;
    }

    _moveArmToRecord() {
        this.tonearm.style.transform = `rotate(${this.ARM_START_ANGLE}deg)`;
    }

    _moveArmToRest() {
        this.tonearm.style.transform = `rotate(${this.ARM_REST_ANGLE}deg)`;
    }

    reset() {
        this.stop();
        this.updateLabel('Sin cancion', '---');
    }
}

// ============================================
// Playlist - Gestion de canciones
// ============================================
class Playlist {
    constructor() {
        this.tracks = [];
        this.currentIndex = -1;

        this.playlistContainer = document.getElementById('playlistItems');
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');

        this.onTrackSelect = null;
        this.onPlaylistChange = null;

        this._setupEventListeners();
        this._render();
    }

    _setupEventListeners() {
        if (!this.dropZone || !this.fileInput) {
            console.error('No se encontraron los elementos del DOM');
            return;
        }

        // Drag & Drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('drag-over');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('drag-over');
            this._handleFiles(Array.from(e.dataTransfer.files));
        });

        // File input
        this.fileInput.addEventListener('change', (e) => {
            this._handleFiles(Array.from(e.target.files));
            e.target.value = '';
        });

        // Click en playlist
        this.playlistContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.playlist-item');
            if (item) {
                this.selectTrack(parseInt(item.dataset.index, 10));
            }
        });

        // Prevenir comportamiento por defecto del navegador
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    _handleFiles(files) {
        if (!files || files.length === 0) return;

        const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.webm'];
        const audioFiles = files.filter(file => {
            if (file.type && file.type.startsWith('audio/')) return true;
            const fileName = file.name.toLowerCase();
            return audioExtensions.some(ext => fileName.endsWith(ext));
        });

        if (audioFiles.length === 0) {
            alert('Por favor, selecciona archivos de audio validos (MP3, WAV, OGG, etc.)');
            return;
        }

        const wasEmpty = this.tracks.length === 0;

        audioFiles.forEach(file => {
            const url = URL.createObjectURL(file);
            const title = this._extractTitle(file.name);

            const track = {
                id: Date.now() + Math.random(),
                title: title,
                artist: 'Archivo local',
                src: url,
                duration: null
            };

            // Obtener duracion
            const tempAudio = new Audio();
            tempAudio.addEventListener('loadedmetadata', () => {
                track.duration = tempAudio.duration;
                this._render();
            });
            tempAudio.src = url;

            this.tracks.push(track);
        });

        this._render();

        if (this.onPlaylistChange) {
            this.onPlaylistChange(this.tracks);
        }

        if (wasEmpty && this.tracks.length > 0) {
            this.selectTrack(0);
        }
    }

    _extractTitle(filename) {
        let title = filename.replace(/\.[^/.]+$/, '');
        title = title.replace(/^\d+[\s.\-_]+/, '');
        title = title.replace(/[_-]+/g, ' ');
        return title.trim() || 'Sin titulo';
    }

    selectTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        this.currentIndex = index;
        this._render();
        if (this.onTrackSelect) {
            this.onTrackSelect(this.tracks[index], index);
        }
    }

    getCurrentTrack() {
        if (this.currentIndex < 0 || this.currentIndex >= this.tracks.length) return null;
        return this.tracks[this.currentIndex];
    }

    next() {
        if (this.tracks.length === 0) return null;
        this.selectTrack((this.currentIndex + 1) % this.tracks.length);
        return this.getCurrentTrack();
    }

    previous() {
        if (this.tracks.length === 0) return null;
        const prevIndex = this.currentIndex <= 0 ? this.tracks.length - 1 : this.currentIndex - 1;
        this.selectTrack(prevIndex);
        return this.getCurrentTrack();
    }

    _render() {
        if (!this.playlistContainer) return;

        if (this.tracks.length === 0) {
            this.playlistContainer.innerHTML = '<li class="playlist-empty">No hay canciones en la lista</li>';
            return;
        }

        this.playlistContainer.innerHTML = this.tracks.map((track, index) => `
            <li class="playlist-item ${index === this.currentIndex ? 'active' : ''}" data-index="${index}">
                <span class="track-number">${index + 1}</span>
                <div class="track-info">
                    <span class="track-title">${this._escapeHtml(track.title)}</span>
                    <span class="track-artist">${this._escapeHtml(track.artist)}</span>
                </div>
                <span class="track-duration">${track.duration ? this._formatTime(track.duration) : '--:--'}</span>
            </li>
        `).join('');
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    _formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// ============================================
// VinylPlayerApp - Integracion principal
// ============================================
class VinylPlayerApp {
    constructor() {
        this.audioPlayer = new AudioPlayer();
        this.turntable = new TurntableUI();
        this.playlist = new Playlist();

        this.playBtn = document.getElementById('playBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.progressBar = document.getElementById('progressBar');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.totalTimeDisplay = document.getElementById('totalTime');
        this.speedSelector = document.getElementById('speedSelector');
        this.iconPlay = this.playBtn.querySelector('.icon-play');
        this.iconPause = this.playBtn.querySelector('.icon-pause');

        this._setupAudioEvents();
        this._setupControlEvents();
        this._setupPlaylistEvents();
        this._setupSpeedEvents();
        this._updatePlayButtonIcon(false);

        // Establecer velocidad inicial
        this.turntable.updateSpeed(1);
    }

    _setupAudioEvents() {
        this.audioPlayer.onPlay = () => {
            this._updatePlayButtonIcon(true);
            this.turntable.play();
        };

        this.audioPlayer.onPause = () => {
            this._updatePlayButtonIcon(false);
            this.turntable.pause();
        };

        this.audioPlayer.onStop = () => {
            this._updatePlayButtonIcon(false);
            this.turntable.stop();
            this._updateProgress(0);
        };

        this.audioPlayer.onTimeUpdate = (data) => {
            this._updateProgress(data.progress);
            this.currentTimeDisplay.textContent = AudioPlayer.formatTime(data.currentTime);
            this.turntable.updateArmPosition(data.progress);
        };

        this.audioPlayer.onLoadedMetadata = (data) => {
            this.totalTimeDisplay.textContent = AudioPlayer.formatTime(data.duration);
            this.turntable.hideLoading();
        };

        this.audioPlayer.onEnded = () => {
            this._playNext();
        };

        this.audioPlayer.onError = (message) => {
            console.error('Error de audio:', message);
            this.turntable.hideLoading();
            this.turntable.stop();
            alert(`Error al reproducir: ${message}`);
        };

        this.audioPlayer.onLoading = (isLoading) => {
            if (isLoading) this.turntable.showLoading();
            else this.turntable.hideLoading();
        };

        this.audioPlayer.onSpeedChange = (speed) => {
            this.turntable.updateSpeed(speed);
        };
    }

    _setupControlEvents() {
        this.playBtn.addEventListener('click', () => {
            if (!this.audioPlayer.hasTrack()) {
                const track = this.playlist.getCurrentTrack();
                if (track) this._loadAndPlay(track);
                return;
            }
            this.audioPlayer.togglePlay();
        });

        this.stopBtn.addEventListener('click', () => this.audioPlayer.stop());
        this.prevBtn.addEventListener('click', () => this._playPrevious());
        this.nextBtn.addEventListener('click', () => this._playNext());

        this.progressBar.addEventListener('input', (e) => {
            this.audioPlayer.seekToPercent(parseFloat(e.target.value));
        });

        this.volumeSlider.addEventListener('input', (e) => {
            this.audioPlayer.setVolumePercent(parseFloat(e.target.value));
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.playBtn.click();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.audioPlayer.seek(this.audioPlayer.getCurrentTime() - 5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.audioPlayer.seek(this.audioPlayer.getCurrentTime() + 5);
                    break;
            }
        });
    }

    _setupPlaylistEvents() {
        this.playlist.onTrackSelect = (track, index) => {
            this._loadAndPlay(track);
        };

        this.playlist.onPlaylistChange = (tracks) => {
            if (tracks.length === 0) {
                this.audioPlayer.stop();
                this.turntable.reset();
                this._updateProgress(0);
                this.currentTimeDisplay.textContent = '0:00';
                this.totalTimeDisplay.textContent = '0:00';
            }
        };
    }

    _setupSpeedEvents() {
        if (!this.speedSelector) return;

        const speedButtons = this.speedSelector.querySelectorAll('.speed-btn');

        speedButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseFloat(btn.dataset.speed);

                // Actualizar estado activo de los botones
                speedButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Cambiar velocidad del audio
                this.audioPlayer.setSpeed(speed);
            });
        });
    }

    _loadAndPlay(track) {
        this.turntable.showLoading();
        this.turntable.updateLabel(track.title, track.artist);
        this.audioPlayer.load(track.src, { title: track.title, artist: track.artist });

        const onCanPlay = () => {
            this.audioPlayer.play();
            this.audioPlayer.audio.removeEventListener('canplaythrough', onCanPlay);
        };
        this.audioPlayer.audio.addEventListener('canplaythrough', onCanPlay);
    }

    _playNext() {
        const track = this.playlist.next();
        if (track) this._loadAndPlay(track);
    }

    _playPrevious() {
        if (this.audioPlayer.getCurrentTime() > 3) {
            this.audioPlayer.seek(0);
            return;
        }
        const track = this.playlist.previous();
        if (track) this._loadAndPlay(track);
    }

    _updatePlayButtonIcon(isPlaying) {
        this.iconPlay.style.display = isPlaying ? 'none' : 'block';
        this.iconPause.style.display = isPlaying ? 'block' : 'none';
    }

    _updateProgress(progress) {
        this.progressBar.value = progress;
    }
}

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    window.vinylPlayer = new VinylPlayerApp();
});
