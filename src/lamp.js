import { AnimationGroup, Color3, Mesh, PointLight, Vector3 } from "@babylonjs/core";


export class Lamp {
    constructor(lightMaterial, mesh, scene, position, animationGroups) {
        // assign scene and light material / texture for future use
        this._scene = scene;
        this._lightMaterial = lightMaterial;

        // lamp sphere illumination
        const lightSphere = Mesh.CreateSphere('lightSphere', 4, 20, this._scene);
        lightSphere.scaling.y = 2;
        lightSphere.setAbsolutePosition(position);
        lightSphere.parent = this.mesh;
        lightSphere.isVisible = false;
        lightSphere.isPickable = false;
        this._lightSphere = lightSphere;

        this.spinAnimation = animationGroups;

        // load lamp when lamp is instantiated
        this._loadLamp(mesh, position);
    }

    _loadLamp(mesh, position) {
        // set lamp position, size, and isPickable to false
        this.mesh = mesh;
        this.mesh.scaling = new Vector3(0.8, 0.8, 0.8);
        this.mesh.setAbsolutePosition(position);
        this.mesh.isPickable = false;
    }

    setTexture() {
        // when lamp is turned on apply new material / texture
        this.isOn = true;
        this.mesh.material = this._lightMaterial;

        // set pointlight from the lamp to have a glow effect (more realistic)
        const lighting = new PointLight('lamp ligthing', this.mesh.getAbsolutePosition(), this._scene);
        lighting.intensity = 30;
        lighting.radius = 2;
        lighting.diffuse = new Color3(0.45, 0.56, 0.8);

        this._findNearestLamp(lighting);
    }

    // push the texture and light to the lamp
    _findNearestLamp(lighting) {
        this._scene.getMeshByName('__root__').getChildMeshes().forEach(m => {
            if (this._lightSphere.intersectsMesh(m)) {
                lighting.includedOnlyMeshes.push(m);
            }
        });
        this._lightSphere.dispose();
    }
}