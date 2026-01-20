/**
 * Playlist - Clase para gestionar la lista de canciones
 */
export class Playlist {
    constructor() {
        this.tracks = [];
        this.currentIndex = -1;

        // Elementos del DOM
        this.playlistContainer = document.getElementById('playlistItems');
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');

        // Verificar que los elementos existen
        console.log('Playlist inicializada');
        console.log('dropZone:', this.dropZone);
        console.log('fileInput:', this.fileInput);
        console.log('playlistContainer:', this.playlistContainer);

        // Callbacks
        this.onTrackSelect = null;
        this.onPlaylistChange = null;

        // Configurar eventos
        this._setupEventListeners();
    }

    /**
     * Configura los event listeners para carga de archivos
     */
    _setupEventListeners() {
        if (!this.dropZone || !this.fileInput) {
            console.error('ERROR: No se encontraron los elementos del DOM');
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
            console.log('Drop detectado, archivos:', e.dataTransfer.files);

            const files = Array.from(e.dataTransfer.files);
            this._handleFiles(files);
        });

        // File input
        this.fileInput.addEventListener('change', (e) => {
            console.log('Archivo seleccionado:', e.target.files);
            const files = Array.from(e.target.files);
            this._handleFiles(files);
            // Reset input para permitir seleccionar el mismo archivo
            e.target.value = '';
        });

        // Click en items de playlist
        this.playlistContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.playlist-item');
            if (item) {
                const index = parseInt(item.dataset.index, 10);
                this.selectTrack(index);
            }
        });

        // Prevenir que el navegador abra los archivos al soltar fuera del dropzone
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());

        console.log('Event listeners configurados correctamente');
    }

    /**
     * Procesa archivos de audio
     * @param {File[]} files - Array de archivos
     */
    _handleFiles(files) {
        console.log('_handleFiles llamado con', files.length, 'archivos');

        if (!files || files.length === 0) {
            console.warn('No se recibieron archivos');
            return;
        }

        // Mostrar info de cada archivo
        files.forEach((file, i) => {
            console.log(`Archivo ${i + 1}:`, file.name, 'Tipo:', file.type, 'Tamaño:', file.size);
        });

        // Extensiones de audio válidas
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.webm'];

        const audioFiles = files.filter(file => {
            // Verificar por MIME type
            if (file.type && file.type.startsWith('audio/')) {
                console.log('Archivo aceptado por MIME type:', file.name);
                return true;
            }
            // Verificar por extensión del archivo
            const fileName = file.name.toLowerCase();
            const hasValidExt = audioExtensions.some(ext => fileName.endsWith(ext));
            if (hasValidExt) {
                console.log('Archivo aceptado por extensión:', file.name);
            }
            return hasValidExt;
        });

        console.log('Archivos de audio válidos:', audioFiles.length);

        if (audioFiles.length === 0) {
            console.warn('No se encontraron archivos de audio válidos');
            alert('Por favor, selecciona archivos de audio válidos (MP3, WAV, OGG, etc.)');
            return;
        }

        // Guardar si es la primera carga
        const wasEmpty = this.tracks.length === 0;
        console.log('Playlist estaba vacía:', wasEmpty);

        audioFiles.forEach(file => {
            this._addTrackFromFile(file);
        });

        console.log('Tracks después de añadir:', this.tracks.length, this.tracks);
        this._render();

        if (this.onPlaylistChange) {
            this.onPlaylistChange(this.tracks);
        }

        // Si la playlist estaba vacía, seleccionar la primera canción
        if (wasEmpty && this.tracks.length > 0) {
            console.log('Seleccionando primera canción automáticamente');
            this.selectTrack(0);
        }
    }

    /**
     * Añade una pista desde un archivo
     * @param {File} file - Archivo de audio
     */
    _addTrackFromFile(file) {
        console.log('Añadiendo archivo:', file.name, 'Tipo:', file.type);
        const url = URL.createObjectURL(file);
        const title = this._extractTitle(file.name);
        console.log('URL creada:', url);

        const track = {
            id: Date.now() + Math.random(),
            title: title,
            artist: 'Archivo local',
            src: url,
            file: file,
            duration: null
        };

        // Obtener duración
        this._getDuration(url).then(duration => {
            track.duration = duration;
            this._render();
        });

        this.tracks.push(track);
    }

    /**
     * Extrae el título del nombre del archivo
     * @param {string} filename - Nombre del archivo
     * @returns {string} Título limpio
     */
    _extractTitle(filename) {
        // Quitar extensión
        let title = filename.replace(/\.[^/.]+$/, '');
        // Quitar números de track comunes (01 -, 01., etc.)
        title = title.replace(/^\d+[\s.\-_]+/, '');
        // Reemplazar guiones bajos y guiones múltiples
        title = title.replace(/[_-]+/g, ' ');
        // Capitalizar primera letra de cada palabra
        title = title.replace(/\b\w/g, l => l.toUpperCase());
        return title.trim() || 'Sin título';
    }

    /**
     * Obtiene la duración de un archivo de audio
     * @param {string} src - URL del audio
     * @returns {Promise<number>} Duración en segundos
     */
    _getDuration(src) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration);
            });
            audio.addEventListener('error', () => {
                resolve(0);
            });
            audio.src = src;
        });
    }

    /**
     * Añade una pista por URL
     * @param {string} url - URL del audio
     * @param {Object} info - Información de la pista
     */
    addTrackFromUrl(url, info = {}) {
        const track = {
            id: Date.now() + Math.random(),
            title: info.title || 'Pista sin título',
            artist: info.artist || 'Artista desconocido',
            src: url,
            duration: null
        };

        this._getDuration(url).then(duration => {
            track.duration = duration;
            this._render();
        });

        this.tracks.push(track);
        this._render();

        if (this.onPlaylistChange) {
            this.onPlaylistChange(this.tracks);
        }
    }

    /**
     * Selecciona una pista por índice
     * @param {number} index - Índice de la pista
     */
    selectTrack(index) {
        console.log('selectTrack llamado con índice:', index);
        if (index < 0 || index >= this.tracks.length) {
            console.warn('Índice fuera de rango:', index, 'tracks:', this.tracks.length);
            return;
        }

        this.currentIndex = index;
        this._render();

        console.log('Track seleccionado:', this.tracks[index]);
        if (this.onTrackSelect) {
            console.log('Llamando onTrackSelect callback');
            this.onTrackSelect(this.tracks[index], index);
        } else {
            console.warn('No hay callback onTrackSelect definido');
        }
    }

    /**
     * Obtiene la pista actual
     * @returns {Object|null} Pista actual
     */
    getCurrentTrack() {
        if (this.currentIndex < 0 || this.currentIndex >= this.tracks.length) {
            return null;
        }
        return this.tracks[this.currentIndex];
    }

    /**
     * Avanza a la siguiente pista
     * @returns {Object|null} Siguiente pista
     */
    next() {
        if (this.tracks.length === 0) return null;

        const nextIndex = (this.currentIndex + 1) % this.tracks.length;
        this.selectTrack(nextIndex);
        return this.getCurrentTrack();
    }

    /**
     * Retrocede a la pista anterior
     * @returns {Object|null} Pista anterior
     */
    previous() {
        if (this.tracks.length === 0) return null;

        const prevIndex = this.currentIndex <= 0
            ? this.tracks.length - 1
            : this.currentIndex - 1;
        this.selectTrack(prevIndex);
        return this.getCurrentTrack();
    }

    /**
     * Elimina una pista por índice
     * @param {number} index - Índice de la pista
     */
    removeTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;

        // Liberar URL si es un blob
        const track = this.tracks[index];
        if (track.src.startsWith('blob:')) {
            URL.revokeObjectURL(track.src);
        }

        this.tracks.splice(index, 1);

        // Ajustar índice actual
        if (this.currentIndex >= this.tracks.length) {
            this.currentIndex = this.tracks.length - 1;
        }

        this._render();

        if (this.onPlaylistChange) {
            this.onPlaylistChange(this.tracks);
        }
    }

    /**
     * Limpia toda la playlist
     */
    clear() {
        // Liberar URLs blob
        this.tracks.forEach(track => {
            if (track.src.startsWith('blob:')) {
                URL.revokeObjectURL(track.src);
            }
        });

        this.tracks = [];
        this.currentIndex = -1;
        this._render();

        if (this.onPlaylistChange) {
            this.onPlaylistChange(this.tracks);
        }
    }

    /**
     * Renderiza la lista de reproducción
     */
    _render() {
        console.log('Renderizando playlist, tracks:', this.tracks.length);

        if (!this.playlistContainer) {
            console.error('ERROR: playlistContainer no existe');
            return;
        }

        if (this.tracks.length === 0) {
            this.playlistContainer.innerHTML = `
                <li class="playlist-empty">
                    No hay canciones en la lista
                </li>
            `;
            return;
        }

        this.playlistContainer.innerHTML = this.tracks.map((track, index) => `
            <li class="playlist-item ${index === this.currentIndex ? 'active' : ''}"
                data-index="${index}">
                <span class="track-number">${index + 1}</span>
                <div class="track-info">
                    <span class="track-title">${this._escapeHtml(track.title)}</span>
                    <span class="track-artist">${this._escapeHtml(track.artist)}</span>
                </div>
                <span class="track-duration">
                    ${track.duration ? this._formatTime(track.duration) : '--:--'}
                </span>
            </li>
        `).join('');
    }

    /**
     * Escapa HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Formatea segundos a mm:ss
     * @param {number} seconds - Tiempo en segundos
     * @returns {string} Tiempo formateado
     */
    _formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Obtiene el número de pistas
     * @returns {number} Número de pistas
     */
    getLength() {
        return this.tracks.length;
    }

    /**
     * Verifica si la playlist está vacía
     * @returns {boolean}
     */
    isEmpty() {
        return this.tracks.length === 0;
    }
}
