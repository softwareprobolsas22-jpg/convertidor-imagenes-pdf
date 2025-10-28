/**
 * Gestor de archivos de imagen para conversión a PDF
 * Maneja la carga, previsualización, captura de fotos, aplicación de filtros y conversión de imágenes
 * Utiliza Bootstrap Modals para una mejor experiencia de usuario
 */
class ImageToPdfConverter {
    constructor() {
        this.images = [];
        this.stream = null;
        this.useMargins = true;
        this.currentCapturedImage = null;
        this.currentImageSource = 'camera'; // Puede ser 'camera' o 'file'
        this.currentFilter = 'bw'; // Filtro predeterminado: Blanco y Negro
        // Márgenes APA en cm convertidos a puntos (1 cm = 28.35 puntos)
        this.marginSize = 0.4 * 28.35;
        
        this.initializeElements();
        this.initializeModals();
        this.attachEventListeners();
    }

    /**
     * Inicializa las referencias a elementos del DOM
     */
    initializeElements() {
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.previewContainer = document.getElementById('previewContainer');
        this.previewGrid = document.getElementById('previewGrid');
        this.imageCount = document.getElementById('imageCount');
        this.actionsContainer = document.getElementById('actionsContainer');
        this.generatePdfBtn = document.getElementById('generatePdfBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.loading = document.getElementById('loading');
        this.cameraButton = document.getElementById('cameraButton');
        this.cameraVideo = document.getElementById('cameraVideo');
        this.cameraCanvas = document.getElementById('cameraCanvas');
        this.captureBtn = document.getElementById('captureBtn');
        this.useMarginsCheckbox = document.getElementById('useMargins');
        
        // Elementos del modal de filtros
        this.filterPreview = document.getElementById('filterPreview');
        this.filterCanvas = document.getElementById('filterCanvas');
        this.filterOptions = document.querySelectorAll('.filter-option');
        this.applyFilterBtn = document.getElementById('applyFilterBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
    }

    /**
     * Inicializa las instancias de Bootstrap Modal
     */
    initializeModals() {
        this.cameraModalElement = document.getElementById('cameraModal');
        this.filterModalElement = document.getElementById('filterModal');
        
        this.cameraModal = new bootstrap.Modal(this.cameraModalElement);
        this.filterModal = new bootstrap.Modal(this.filterModalElement);
        
        // Event listener para limpiar stream cuando se cierra el modal de cámara
        this.cameraModalElement.addEventListener('hidden.bs.modal', () => {
            this.stopCamera();
        });
        
        // Event listener para limpiar cuando se cierra el modal de filtros
        this.filterModalElement.addEventListener('hidden.bs.modal', () => {
            this.currentCapturedImage = null;
        });
    }

    /**
     * Adjunta todos los event listeners necesarios
     */
    attachEventListeners() {
        // Click en zona de carga
        this.uploadZone.addEventListener('click', () => this.fileInput.click());
        
        // Selección de archivos
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // Drag and drop
        this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Botones de acción
        this.generatePdfBtn.addEventListener('click', () => this.generatePdf());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        
        // Cámara
        this.cameraButton.addEventListener('click', () => this.openCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        
        // Configuración de márgenes
        this.useMarginsCheckbox.addEventListener('change', (e) => {
            this.useMargins = e.target.checked;
        });

        // Modal de filtros
        this.filterOptions.forEach(option => {
            option.addEventListener('click', () => this.selectFilter(option));
        });
        this.applyFilterBtn.addEventListener('click', () => this.applyFilter());
        this.retakeBtn.addEventListener('click', () => this.retakePhoto());
    }

    /**
     * Abre la cámara para capturar fotos
     */
    async openCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            });
            
            this.cameraVideo.srcObject = this.stream;
            this.cameraModal.show();
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            alert('No se pudo acceder a la cámara. Por favor verifica los permisos.');
        }
    }

    /**
     * Detiene el stream de la cámara y libera recursos
     */
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    /**
     * Captura una foto desde el stream de la cámara y abre el modal de filtros
     */
    capturePhoto() {
        const video = this.cameraVideo;
        const canvas = this.cameraCanvas;
        
        // Configura el canvas con las dimensiones del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Dibuja el frame actual del video en el canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convierte a data URL
        this.currentImageSource = 'camera';
        
        // Cierra la cámara y abre el modal de filtros
        this.cameraModal.hide();
        
        // Espera a que se cierre completamente el modal de cámara antes de abrir el de filtros
        setTimeout(() => this.openFilterModal(), 300);
    }

    /**
     * Abre el modal de filtros con la imagen capturada
     */
    openFilterModal() {
        // Muestra la imagen original en la vista previa
        this.filterPreview.src = this.currentCapturedImage;
        
        // Resetea la selección al filtro predeterminado
        this.currentFilter = 'bw';
        this.filterOptions.forEach(option => {
            if (option.dataset.filter === 'bw') {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
        
        // Aplica el filtro predeterminado a la vista previa
        setTimeout(() => this.updateFilterPreview(), 100);
        
        this.filterModal.show();
    }

    /**
     * Selecciona un filtro y actualiza la vista previa
     */
    selectFilter(selectedOption) {
        // Actualiza la UI de opciones
        this.filterOptions.forEach(option => {
            option.classList.remove('active');
        });
        selectedOption.classList.add('active');
        
        // Guarda el filtro seleccionado
        this.currentFilter = selectedOption.dataset.filter;
        
        // Actualiza la vista previa
        this.updateFilterPreview();
    }

    /**
     * Actualiza la vista previa con el filtro seleccionado
     */
    updateFilterPreview() {
        const img = new Image();
        img.onload = () => {
            const canvas = this.filterCanvas;
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Aplica el filtro correspondiente
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const filteredData = this.applyImageFilter(imageData, this.currentFilter);
            ctx.putImageData(filteredData, 0, 0);
            
            // Actualiza la vista previa
            this.filterPreview.src = canvas.toDataURL('image/jpeg', 0.95);
        };
        img.src = this.currentCapturedImage;
    }

    /**
     * Aplica un filtro específico a los datos de imagen
     * @param {ImageData} imageData - Datos de la imagen
     * @param {string} filterType - Tipo de filtro a aplicar
     * @returns {ImageData} Datos de imagen filtrados
     */
    applyImageFilter(imageData, filterType) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        switch(filterType) {
            case 'grayscale':
                // Convierte a escala de grises usando promedio ponderado
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    data[i] = gray;
                    data[i + 1] = gray;
                    data[i + 2] = gray;
                }
                break;
                
            case 'bw':
                // Algoritmo optimizado de escaneo suave y rápido
                
                // Paso 1: Convertir a escala de grises con aumento moderado de brillo
                const grayData = new Uint8ClampedArray(width * height);
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    // Aumenta solo 18% el brillo (más moderado)
                    grayData[i / 4] = Math.min(255, gray * 1.18);
                }
                
                // Paso 2: Calcula umbral global base (más rápido que todo adaptativo)
                let sumTotal = 0;
                // Muestrea solo el 10% de los píxeles para calcular promedio global
                for (let i = 0; i < grayData.length; i += 10) {
                    sumTotal += grayData[i];
                }
                const globalThreshold = (sumTotal / (grayData.length / 10)) * 0.92; // 92% del promedio
                
                // Paso 3: Aplicar umbral con ajuste local ligero (más rápido)
                const blockSize = Math.floor(Math.min(width, height) / 16); // Bloques grandes = rápido
                
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = y * width + x;
                        const pixelValue = grayData[idx];
                        
                        // Ajuste local solo en los bordes (evita sobreiluminación en costados)
                        let adjustedThreshold = globalThreshold;
                        
                        // Detecta si estamos cerca de los bordes
                        const edgeDistance = Math.min(x, width - x, y, height - y);
                        const edgeRatio = Math.min(edgeDistance / blockSize, 1);
                        
                        // En los bordes, reduce el umbral para evitar blanqueo excesivo
                        if (edgeRatio < 1) {
                            adjustedThreshold = globalThreshold * (0.85 + 0.15 * edgeRatio);
                        }
                        
                        // Calcula diferencia
                        const diff = pixelValue - adjustedThreshold;
                        
                        // Umbral con transición suave
                        let bw;
                        if (diff > 25) {
                            bw = 255; // Blanco
                        } else if (diff < -25) {
                            bw = 0; // Negro
                        } else {
                            // Transición suave en zona de 50 valores
                            const ratio = (diff + 25) / 50;
                            bw = Math.round(ratio * 255);
                        }
                        
                        const dataIdx = idx * 4;
                        data[dataIdx] = bw;
                        data[dataIdx + 1] = bw;
                        data[dataIdx + 2] = bw;
                    }
                }
                break;
            case 'enhanced':
                // Mejorado: Aumenta contraste y nitidez manteniendo color
                for (let i = 0; i < data.length; i += 4) {
                    // Aumenta contraste 30%
                    const contrast = 1.3;
                    data[i] = Math.min(255, Math.max(0, ((data[i] / 255 - 0.5) * contrast + 0.5) * 255));
                    data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] / 255 - 0.5) * contrast + 0.5) * 255));
                    data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] / 255 - 0.5) * contrast + 0.5) * 255));
                    
                    // Aumenta ligeramente la saturación
                    const max = Math.max(data[i], data[i + 1], data[i + 2]);
                    const min = Math.min(data[i], data[i + 1], data[i + 2]);
                    const saturation = 1.1;
                    
                    if (max !== min) {
                        data[i] = Math.min(255, min + (data[i] - min) * saturation);
                        data[i + 1] = Math.min(255, min + (data[i + 1] - min) * saturation);
                        data[i + 2] = Math.min(255, min + (data[i + 2] - min) * saturation);
                    }
                }
                break;
                
            case 'original':
            default:
                // No aplica ningún filtro
                break;
        }
        
        return imageData;
    }

    /**
     * Aplica el filtro seleccionado y agrega la imagen a la colección
     */
    applyFilter() {
        if (!this.currentCapturedImage) return;
        
        // Obtiene la imagen con el filtro aplicado
        const filteredImage = this.filterPreview.src;
        
        // Determina si la imagen es de cámara o archivo
        const isFromCamera = this.currentImageSource === 'camera';
        
        // Agrega a la colección con información del filtro
        this.images.push({
            file: null,
            dataUrl: filteredImage,
            id: Date.now() + Math.random(),
            isFromCamera: isFromCamera,
            filter: this.currentFilter
        });
        
        this.renderPreviews();
        this.filterModal.hide();
        
        // Muestra feedback visual
        this.showFilterSuccess();
        
        // Resetea la fuente para la próxima imagen
        this.currentImageSource = 'camera';
    }

    /**
     * Muestra feedback visual de filtro aplicado exitosamente
     */
    showFilterSuccess() {
        const originalText = this.applyFilterBtn.innerHTML;
        this.applyFilterBtn.innerHTML = '<i class="fas fa-check"></i> ¡Aplicado!';
        this.applyFilterBtn.classList.add('btn-success');
        this.applyFilterBtn.classList.remove('btn-primary');
        
        setTimeout(() => {
            this.applyFilterBtn.innerHTML = originalText;
            this.applyFilterBtn.classList.remove('btn-success');
            this.applyFilterBtn.classList.add('btn-primary');
        }, 1000);
    }

    /**
     * Vuelve a abrir la cámara para capturar otra foto
     */
    retakePhoto() {
        this.filterModal.hide();
        setTimeout(() => this.openCamera(), 300);
    }

    /**
     * Maneja el evento dragover
     */
    handleDragOver(e) {
        e.preventDefault();
        this.uploadZone.classList.add('dragover');
    }

    /**
     * Maneja el evento dragleave
     */
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('dragover');
    }

    /**
     * Maneja el evento drop de archivos
     */
    handleDrop(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        this.handleFiles(files);
    }

    /**
     * Procesa los archivos cargados
     * @param {FileList} files - Lista de archivos seleccionados
     */
    handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );

        if (imageFiles.length === 0) {
            alert('Por favor selecciona al menos una imagen válida.');
            return;
        }

        imageFiles.forEach(file => this.addImage(file));
        this.updateUI();
    }

    /**
     * Agrega una imagen a la colección (desde archivo)
     * @param {File} file - Archivo de imagen
     */
    addImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Guarda la imagen capturada y abre el modal de filtros
            this.currentCapturedImage = e.target.result;
            this.currentImageSource = 'file';
            this.openFilterModal();
        };
        reader.readAsDataURL(file);
    }

    /**
     * Renderiza las vistas previas de las imágenes
     */
    renderPreviews() {
        this.previewGrid.innerHTML = '';
        
        this.images.forEach((image, index) => {
            const previewItem = this.createPreviewElement(image, index);
            this.previewGrid.appendChild(previewItem);
        });

        this.updateUI();
    }

    /**
     * Obtiene el nombre legible del filtro
     * @param {string} filter - Código del filtro
     * @returns {string} Nombre legible del filtro
     */
    getFilterName(filter) {
        const filterNames = {
            'original': 'Original',
            'grayscale': 'Escala de Grises',
            'bw': 'B/N',
            'enhanced': 'Mejorado'
        };
        return filterNames[filter] || 'Original';
    }

    /**
     * Crea un elemento de vista previa
     * @param {Object} image - Objeto de imagen
     * @param {number} index - Índice de la imagen
     * @returns {HTMLElement} Elemento de vista previa
     */
    createPreviewElement(image, index) {
        const div = document.createElement('div');
        div.className = 'preview-item';
        
        const cameraIcon = image.isFromCamera ? '<i class="fas fa-camera" style="font-size: 0.7rem;"></i> ' : '';
        const filterBadge = image.isFromCamera ? `<span class="filter-badge">${this.getFilterName(image.filter)}</span>` : '';
        
        div.innerHTML = `
            <span class="order-badge">${cameraIcon}${index + 1}</span>
            <img src="${image.dataUrl}" alt="Preview ${index + 1}">
            ${filterBadge}
            <button class="remove-btn" data-id="${image.id}">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Event listener para eliminar imagen
        const removeBtn = div.querySelector('.remove-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeImage(image.id);
        });

        return div;
    }

    /**
     * Elimina una imagen de la colección
     * @param {string} id - ID de la imagen a eliminar
     */
    removeImage(id) {
        this.images = this.images.filter(img => img.id !== id);
        this.renderPreviews();
    }

    /**
     * Actualiza la interfaz según el estado actual
     */
    updateUI() {
        const hasImages = this.images.length > 0;
        
        this.previewContainer.style.display = hasImages ? 'block' : 'none';
        this.actionsContainer.style.display = hasImages ? 'flex' : 'none';
        this.imageCount.textContent = this.images.length;
    }

    /**
     * Genera el PDF con todas las imágenes cargadas
     * Optimiza cada imagen y aplica márgenes si está configurado
     */
    async generatePdf() {
        if (this.images.length === 0) return;

        this.loading.style.display = 'block';
        this.actionsContainer.style.display = 'none';

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            for (let i = 0; i < this.images.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                // Optimiza la imagen antes de agregarla
                const optimizedImage = await this.optimizeImage(this.images[i].dataUrl);
                
                // Obtiene dimensiones de la página
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                // Calcula el área disponible considerando márgenes
                let availableWidth = pageWidth;
                let availableHeight = pageHeight;
                let xStart = 0;
                let yStart = 0;
                
                if (this.useMargins) {
                    availableWidth = pageWidth - (2 * this.marginSize);
                    availableHeight = pageHeight - (2 * this.marginSize);
                    xStart = this.marginSize;
                    yStart = this.marginSize;
                }
                
                // Calcula dimensiones manteniendo proporción
                const img = await this.loadImage(optimizedImage);
                const imgRatio = img.width / img.height;
                const areaRatio = availableWidth / availableHeight;
                
                let finalWidth, finalHeight, xOffset, yOffset;
                
                if (imgRatio > areaRatio) {
                    // La imagen es más ancha que el área disponible
                    finalWidth = availableWidth;
                    finalHeight = availableWidth / imgRatio;
                    xOffset = xStart;
                    yOffset = yStart + (availableHeight - finalHeight) / 2;
                } else {
                    // La imagen es más alta que el área disponible
                    finalHeight = availableHeight;
                    finalWidth = availableHeight * imgRatio;
                    xOffset = xStart + (availableWidth - finalWidth) / 2;
                    yOffset = yStart;
                }

                pdf.addImage(optimizedImage, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
            }

            // Genera el nombre del archivo
            const marginText = this.useMargins ? '_APA' : '';
            const fileName = `imagenes${marginText}_${new Date().getTime()}.pdf`;
            pdf.save(fileName);

            this.showSuccess();
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Ocurrió un error al generar el PDF. Por favor intenta de nuevo.');
        } finally {
            this.loading.style.display = 'none';
            this.actionsContainer.style.display = 'flex';
        }
    }

    /**
     * Optimiza una imagen para reducir su tamaño
     * @param {string} dataUrl - Data URL de la imagen
     * @returns {Promise<string>} Data URL de la imagen optimizada
     */
    optimizeImage(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Define tamaño máximo (A4 en 150 DPI)
                const maxWidth = 1240;
                const maxHeight = 1754;
                
                let width = img.width;
                let height = img.height;
                
                // Escala si es necesario
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                // Comprime con calidad del 85%
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = dataUrl;
        });
    }

    /**
     * Carga una imagen y retorna el elemento Image
     * @param {string} src - Source de la imagen
     * @returns {Promise<HTMLImageElement>} Elemento Image cargado
     */
    loadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
        });
    }

    /**
     * Muestra mensaje de éxito y limpia automáticamente las imágenes
     */
    showSuccess() {
        const originalText = this.generatePdfBtn.innerHTML;
        this.generatePdfBtn.innerHTML = '<i class="fas fa-check"></i> ¡PDF Generado!';
        this.generatePdfBtn.classList.add('btn-success');
        this.generatePdfBtn.classList.remove('btn-primary');
        
        setTimeout(() => {
            this.generatePdfBtn.innerHTML = originalText;
            this.generatePdfBtn.classList.remove('btn-success');
            this.generatePdfBtn.classList.add('btn-primary');
            
            // Limpia automáticamente todas las imágenes después de generar el PDF
            this.images = [];
            this.fileInput.value = '';
            this.renderPreviews();
        }, 3000);
    }

    /**
     * Limpia todas las imágenes y reinicia la aplicación
     */
    clearAll() {
        if (confirm('¿Estás seguro de que deseas eliminar todas las imágenes?')) {
            this.images = [];
            this.fileInput.value = '';
            this.renderPreviews();
        }
    }
}

// Inicializa la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new ImageToPdfConverter();
});