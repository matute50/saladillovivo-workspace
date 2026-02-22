import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface PlayerGeometry {
    width: number;
    height: number;
    top: number;
    left: number;
}

const DEFAULT_GEOMETRY: PlayerGeometry = {
    width: 0,
    height: 0,
    top: 0,
    left: 0,
};

interface GeometryState {
    playerGeometry: PlayerGeometry;
    setPlayerGeometry: (geometry: PlayerGeometry) => void;
}

export const usePlayerGeometryStore = create<GeometryState>()(
    devtools(
        (set) => ({
            playerGeometry: DEFAULT_GEOMETRY,
            setPlayerGeometry: (geometry) => set({ playerGeometry: geometry }),
        }),
        { name: 'PlayerGeometryStore' }
    )
);
