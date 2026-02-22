import React from 'react';
import Image from 'next/image';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, imageAlt }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
      <div className="relative bg-white p-2 rounded-lg shadow-lg max-w-3xl max-h-[90vh] overflow-hidden mt-8 md:mt-0">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-800 text-white rounded-full p-3 z-10 hover:bg-gray-700 transition"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>
        <Image
          src={imageUrl}
          alt={imageAlt}
          width={800} // Adjust as needed
          height={600} // Adjust as needed
          className="object-contain" // Reemplaza objectFit
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
          unoptimized
        />
      </div>
    </div>
  );
};

export default ImageModal;
