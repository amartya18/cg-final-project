import { AnimationGroup, Color3, Mesh, PointLight, Vector3 } from "@babylonjs/core";


export class Lamp {
    constructor(lightMaterial, mesh, scene, position, animationGroups) {
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

        this._loadLamp(mesh, position);
    }

    _loadLamp(mesh, position) {
        this.mesh = mesh;
        this.mesh.scaling = new Vector3(0.8, 0.8, 0.8);
        this.mesh.setAbsolutePosition(position);
        this.mesh.isPickable = false;
    }

    setTexture() {
        this.isOn = true;
        // lamp default animation
        // this.spinAnimation.play();
        // console.log(this.spinAnimation.isPlaying);
        this.mesh.material = this._lightMaterial;

        const lighting = new PointLight('lamp ligthing', this.mesh.getAbsolutePosition(), this._scene);
        lighting.intensity = 30;
        lighting.radius = 2;
        lighting.diffuse = new Color3(0.45, 0.56, 0.8);

        this._findNearestLamp(lighting);
    }

    _findNearestLamp(lighting) {
        this._scene.getMeshByName('__root__').getChildMeshes().forEach(m => {
            if (this._lightSphere.intersectsMesh(m)) {
                lighting.includedOnlyMeshes.push(m);
            }
        });
        this._lightSphere.dispose();
    }
}