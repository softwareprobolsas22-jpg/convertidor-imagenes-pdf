        /**
         * Gestor de archivos de imagen para conversión a PDF
         * Maneja la carga, previsualización, captura de fotos y conversión de imágenes
         */
        class ImageToPdfConverter {
            constructor() {
                this.images = [];
                this.stream = null;
                this.useMargins = true;
                // Márgenes APA en cm convertidos a puntos (1 cm = 28.35 puntos)
                this.marginSize = 0.4 * 28.35; //11,34 puntos
                
                this.initializeElements();
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
                this.cameraModal = document.getElementById('cameraModal');
                this.cameraVideo = document.getElementById('cameraVideo');
                this.cameraCanvas = document.getElementById('cameraCanvas');
                this.captureBtn = document.getElementById('captureBtn');
                this.closeCameraBtn = document.getElementById('closeCameraBtn');
                this.useMarginsCheckbox = document.getElementById('useMargins');
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
                this.closeCameraBtn.addEventListener('click', () => this.closeCamera());
                
                // Configuración de márgenes
                this.useMarginsCheckbox.addEventListener('change', (e) => {
                    this.useMargins = e.target.checked;
                });
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
                    this.cameraModal.classList.add('active');
                } catch (error) {
                    console.error('Error al acceder a la cámara:', error);
                    alert('No se pudo acceder a la cámara. Por favor verifica los permisos.');
                }
            }

            /**
             * Captura una foto desde el stream de la cámara
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
                
                // Convierte a data URL y agrega como imagen
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                
                this.images.push({
                    file: null,
                    dataUrl: dataUrl,
                    id: Date.now() + Math.random(),
                    isFromCamera: true
                });
                
                this.renderPreviews();
                
                // Muestra feedback visual
                this.showCaptureSuccess();
            }

            /**
             * Muestra feedback visual de captura exitosa
             */
            showCaptureSuccess() {
                const originalText = this.captureBtn.innerHTML;
                this.captureBtn.innerHTML = '<i class="fas fa-check"></i> ¡Capturada!';
                this.captureBtn.classList.add('btn-success');
                this.captureBtn.classList.remove('btn-primary');
                
                setTimeout(() => {
                    this.captureBtn.innerHTML = originalText;
                    this.captureBtn.classList.remove('btn-success');
                    this.captureBtn.classList.add('btn-primary');
                }, 1000);
            }

            /**
             * Cierra la cámara y libera los recursos
             */
            closeCamera() {
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }
                this.cameraModal.classList.remove('active');
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
             * Agrega una imagen a la colección
             * @param {File} file - Archivo de imagen
             */
            addImage(file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.images.push({
                        file: file,
                        dataUrl: e.target.result,
                        id: Date.now() + Math.random(),
                        isFromCamera: false
                    });
                    this.renderPreviews();
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
             * Crea un elemento de vista previa
             * @param {Object} image - Objeto de imagen
             * @param {number} index - Índice de la imagen
             * @returns {HTMLElement} Elemento de vista previa
             */
            createPreviewElement(image, index) {
                const div = document.createElement('div');
                div.className = 'preview-item';
                
                const cameraIcon = image.isFromCamera ? '<i class="fas fa-camera" style="font-size: 0.7rem;"></i> ' : '';
                
                div.innerHTML = `
                    <span class="order-badge">${cameraIcon}${index + 1}</span>
                    <img src="${image.dataUrl}" alt="Preview ${index + 1}">
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
                    const fileName = `Documento$_${new Date().getTime()}.pdf`;
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
             * Muestra mensaje de éxito
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