/**
 * AudioPlayer - Clase para controlar la reproducción de audio
 * Utiliza la HTML5 Audio API
 */
export class AudioPlayer {
    constructor() {
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentTrack = null;
        this.volume = 0.8;

        // Configuración inicial
        this.audio.volume = this.volume;
        this.audio.preload = 'metadata';

        // Event listeners internos
        this._setupEventListeners();

        // Callbacks externos
        this.onPlay = null;
        this.onPause = null;
        this.onStop = null;
        this.onTimeUpdate = null;
        this.onLoadedMetadata = null;
        this.onEnded = null;
        this.onError = null;
        this.onLoading = null;
    }

    /**
     * Configura los event listeners del elemento audio
     */
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
                this.onLoadedMetadata({
                    duration: this.audio.duration
                });
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

    /**
     * Obtiene el mensaje de error apropiado
     */
    _getErrorMessage(e) {
        const error = this.audio.error;
        if (!error) return 'Error desconocido';

        switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
                return 'Reproducción abortada';
            case MediaError.MEDIA_ERR_NETWORK:
                return 'Error de red';
            case MediaError.MEDIA_ERR_DECODE:
                return 'Error al decodificar';
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                return 'Formato no soportado';
            default:
                return 'Error desconocido';
        }
    }

    /**
     * Carga una pista de audio
     * @param {string} src - URL o ruta del archivo de audio
     * @param {Object} trackInfo - Información de la pista
     */
    load(src, trackInfo = {}) {
        this.currentTrack = {
            src,
            title: trackInfo.title || 'Sin título',
            artist: trackInfo.artist || 'Artista desconocido',
            ...trackInfo
        };

        this.audio.src = src;
        this.audio.load();
    }

    /**
     * Reproduce el audio
     */
    async play() {
        if (!this.audio.src) return;

        try {
            await this.audio.play();
        } catch (error) {
            console.error('Error al reproducir:', error);
            if (this.onError) this.onError(error.message);
        }
    }

    /**
     * Pausa el audio
     */
    pause() {
        this.audio.pause();
    }

    /**
     * Alterna entre play y pause
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Detiene el audio y reinicia al inicio
     */
    stop() {
        this.pause();
        this.audio.currentTime = 0;
        if (this.onStop) this.onStop();
    }

    /**
     * Salta a un tiempo específico
     * @param {number} time - Tiempo en segundos
     */
    seek(time) {
        if (isNaN(this.audio.duration)) return;
        this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
    }

    /**
     * Salta a un porcentaje específico
     * @param {number} percent - Porcentaje (0-100)
     */
    seekToPercent(percent) {
        if (isNaN(this.audio.duration)) return;
        const time = (percent / 100) * this.audio.duration;
        this.seek(time);
    }

    /**
     * Establece el volumen
     * @param {number} volume - Volumen (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audio.volume = this.volume;
    }

    /**
     * Establece el volumen por porcentaje
     * @param {number} percent - Porcentaje (0-100)
     */
    setVolumePercent(percent) {
        this.setVolume(percent / 100);
    }

    /**
     * Obtiene el tiempo actual
     * @returns {number} Tiempo actual en segundos
     */
    getCurrentTime() {
        return this.audio.currentTime;
    }

    /**
     * Obtiene la duración total
     * @returns {number} Duración en segundos
     */
    getDuration() {
        return this.audio.duration || 0;
    }

    /**
     * Obtiene el progreso como porcentaje
     * @returns {number} Progreso (0-100)
     */
    getProgress() {
        if (!this.audio.duration || isNaN(this.audio.duration)) return 0;
        return (this.audio.currentTime / this.audio.duration) * 100;
    }

    /**
     * Formatea segundos a mm:ss
     * @param {number} seconds - Tiempo en segundos
     * @returns {string} Tiempo formateado
     */
    static formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Obtiene la información de la pista actual
     * @returns {Object|null} Información de la pista
     */
    getCurrentTrack() {
        return this.currentTrack;
    }

    /**
     * Verifica si hay una pista cargada
     * @returns {boolean}
     */
    hasTrack() {
        return !!this.audio.src;
    }

    /**
     * Limpia y libera recursos
     */
    destroy() {
        this.stop();
        this.audio.src = '';
        this.currentTrack = null;
    }
}
