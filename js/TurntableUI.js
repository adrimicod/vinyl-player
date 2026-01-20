/**
 * TurntableUI - Clase para controlar las animaciones del tocadiscos
 */
export class TurntableUI {
    constructor() {
        // Elementos del DOM
        this.vinyl = document.getElementById('vinyl');
        this.tonearm = document.getElementById('tonearm');
        this.powerLight = document.getElementById('powerLight');
        this.labelTitle = document.getElementById('labelTitle');
        this.labelArtist = document.getElementById('labelArtist');

        // Estado
        this.isSpinning = false;
        this.armPosition = 0; // 0 = posición de reposo, 100 = final del disco

        // Configuración de ángulos del brazo (pivota desde la derecha)
        // Ángulos negativos = hacia el disco, positivos = alejado del disco
        this.ARM_REST_ANGLE = 45;     // Ángulo en reposo (alejado del disco, a la derecha)
        this.ARM_START_ANGLE = 5;     // Ángulo al inicio del disco (borde exterior)
        this.ARM_END_ANGLE = -20;     // Ángulo al final del disco (cerca del centro)

        // Establecer posición inicial del brazo
        this._moveArmToRest();
    }

    /**
     * Inicia la animación de reproducción
     */
    play() {
        // Encender luz
        this.powerLight.classList.add('on', 'playing');
        this.powerLight.classList.remove('loading');

        // Mover brazo al disco
        this._moveArmToRecord();

        // Pequeño delay para que el brazo llegue antes de girar
        setTimeout(() => {
            this._startSpinning();
        }, 800);
    }

    /**
     * Pausa la animación
     */
    pause() {
        this._stopSpinning();
        this.powerLight.classList.remove('playing');
        // El brazo permanece en su posición
    }

    /**
     * Detiene completamente y reinicia
     */
    stop() {
        this._stopSpinning();
        this._moveArmToRest();
        this.powerLight.classList.remove('on', 'playing');
        this.armPosition = 0;
    }

    /**
     * Actualiza la posición del brazo según el progreso
     * @param {number} progress - Progreso de la canción (0-100)
     */
    updateArmPosition(progress) {
        if (!this.isSpinning) return;

        this.armPosition = progress;

        // Calcular ángulo interpolado entre inicio y fin
        const angle = this.ARM_START_ANGLE +
            (progress / 100) * (this.ARM_END_ANGLE - this.ARM_START_ANGLE);

        this.tonearm.style.transform = `rotate(${angle}deg)`;
    }

    /**
     * Actualiza la información de la etiqueta
     * @param {string} title - Título de la canción
     * @param {string} artist - Artista
     */
    updateLabel(title, artist) {
        this.labelTitle.textContent = title || 'Sin canción';
        this.labelArtist.textContent = artist || '---';
    }

    /**
     * Muestra estado de carga
     */
    showLoading() {
        this.powerLight.classList.add('loading');
        this.powerLight.classList.remove('on', 'playing');
        this.vinyl.classList.add('loading-track');
    }

    /**
     * Oculta estado de carga
     */
    hideLoading() {
        this.powerLight.classList.remove('loading');
        this.vinyl.classList.remove('loading-track');
    }

    /**
     * Inicia la rotación del vinilo
     */
    _startSpinning() {
        this.vinyl.classList.add('spinning');
        this.isSpinning = true;
    }

    /**
     * Detiene la rotación del vinilo
     */
    _stopSpinning() {
        this.vinyl.classList.remove('spinning');
        this.isSpinning = false;
    }

    /**
     * Mueve el brazo al disco
     */
    _moveArmToRecord() {
        this.tonearm.classList.add('tracking');
        this.tonearm.style.transform = `rotate(${this.ARM_START_ANGLE}deg)`;
    }

    /**
     * Mueve el brazo a la posición de reposo
     */
    _moveArmToRest() {
        this.tonearm.classList.remove('tracking');
        this.tonearm.style.transform = `rotate(${this.ARM_REST_ANGLE}deg)`;
    }

    /**
     * Resetea el estado visual completamente
     */
    reset() {
        this.stop();
        this.updateLabel('Sin canción', '---');
    }

    /**
     * Obtiene el estado actual
     * @returns {Object} Estado del tocadiscos
     */
    getState() {
        return {
            isSpinning: this.isSpinning,
            armPosition: this.armPosition
        };
    }
}
