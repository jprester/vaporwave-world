// n8ao ships no types. Only what the forms use (see FormsEffects).
declare module "n8ao" {
  import type { Camera, Color, Scene } from "three";
  import { Pass } from "postprocessing";

  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: {
      aoRadius: number;
      distanceFalloff: number;
      intensity: number;
      halfRes: boolean;
      color: Color;
    };
    setQualityMode(mode: "Performance" | "Low" | "Medium" | "High" | "Ultra"): void;
  }
}
