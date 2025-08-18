import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Trash2, Check } from 'lucide-react';
import { useImageUpload } from '../../hooks/useImageUpload';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  currentImage?: string;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  currentImage
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>(currentImage || '');
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadImage, deleteImage, getUploadedImages, uploading, uploadProgress, error } = useImageUpload();

  // Carregar imagens quando o modal abrir
  React.useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen]);

  const loadImages = async () => {
    try {
      console.log('🔄 Recarregando lista de imagens...');
      const images = await getUploadedImages();
      setUploadedImages(images);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    console.log('📁 Arquivo selecionado para upload');
    const file = files[0];
    
    try {
      console.log('🚀 Iniciando processo de upload...');
      const uploadedImage = await uploadImage(file);
      console.log('✅ Upload concluído, recarregando lista...');
      await loadImages(); // Recarregar lista de imagens
      setSelectedImage(uploadedImage.url);
    } catch (err) {
      console.error('Erro no upload:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('📂 Arquivo arrastado para upload');
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (confirm('Tem certeza que deseja excluir esta imagem?')) {
      try {
        console.log('🗑️ Iniciando exclusão da imagem...');
        await deleteImage(imageUrl);
        console.log('✅ Imagem excluída, recarregando lista...');
        await loadImages(); // Recarregar lista de imagens
        
        if (selectedImage === imageUrl) {
          setSelectedImage('');
        }
      } catch (error) {
        console.error('Erro ao deletar imagem:', error);
        alert('Erro ao deletar imagem. Tente novamente.');
      }
    }
  };

  const handleConfirm = () => {
    if (selectedImage) {
      console.log('✅ Confirmando seleção da imagem:', selectedImage.substring(0, 50) + '...');
      onSelectImage(selectedImage);
      
      console.log('🎉 Mostrando feedback de sucesso...');
      // Mostrar feedback de sucesso
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
      successMessage.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Imagem selecionada com sucesso!
      `;
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          successMessage.remove();
        }
      }, 3000);
      
      console.log('🚪 Fechando modal de imagens...');
      onClose();
    } else {
      console.warn('⚠️ Nenhuma imagem selecionada para confirmar');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Gerenciar Imagens</h2>
              <p className="text-gray-600 text-sm">Faça upload ou selecione uma imagem existente</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Upload Area */}
          <div className="mb-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Faça upload de uma nova imagem
              </h3>
              <p className="text-gray-600 mb-4">
                <p className="text-gray-600 text-sm">Faça upload ou selecione uma imagem existente (salva no banco de dados)</p>
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {uploading ? 'Fazendo upload...' : 'Selecionar Arquivo'}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Formatos aceitos: JPG, PNG, GIF, WebP (máx. 5MB)
              </p>
              
              {/* Barra de progresso do upload */}
              {uploading && uploadProgress > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Fazendo upload... {uploadProgress}%</p>
                </div>
              )}
              
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <p className="text-blue-700 font-medium">💾 Suas imagens são salvas no banco de dados</p>
                <p className="text-blue-600">🌐 Ficam disponíveis permanentemente e sincronizadas</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />

            {/* Status de upload */}
            {uploading && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-sm font-medium">📤 Fazendo upload da imagem...</p>
                <p className="text-blue-600 text-xs">Por favor, aguarde enquanto salvamos sua imagem no banco de dados.</p>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Images Gallery */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Imagens Disponíveis ({uploadedImages.length})
              {uploading && <span className="text-blue-600 text-sm ml-2">(Atualizando...)</span>}
            </h3>

            {uploadedImages.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nenhuma imagem encontrada</p>
                <p className="text-gray-400 text-sm">Faça upload da primeira imagem</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {uploadedImages.map((image, index) => (
                  <div
                    key={index}
                    className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedImage === image.url
                        ? 'border-purple-500 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedImage(image.url)}
                  >
                    <div className="aspect-square">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Selected Indicator */}
                    {selectedImage === image.url && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                        <Check size={16} />
                      </div>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.url);
                      }}
                      className="absolute top-2 left-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Excluir imagem"
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* Image Info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs truncate">{image.name}</p>
                      <p className="text-xs text-gray-300">{formatFileSize(image.size)}</p>
                      <p className="text-xs text-green-300">✅ Salva no banco</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedImage || uploading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            {uploading ? 'Aguarde...' : 'Confirmar Seleção'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;