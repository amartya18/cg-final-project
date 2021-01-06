import { Mesh, SceneLoader, MeshBuilder, StandardMaterial, Texture, Vector3, Color3, Color4, Scene, TransformNode, ExecuteCodeAction, ActionManager, PBRMetallicRoughnessMaterial, AnimationGroup } from "@babylonjs/core";
import { Lamp } from './lamp';

export class Level {
    constructor(scene) {
        this._scene = scene;

        // lamp attributes
        this._lampClones = [];

        const lightMaterial = new PBRMetallicRoughnessMaterial('lamp light', this._scene);
        lightMaterial.emissiveTexture = new Texture('./textures/lampOn.png', this._scene, true, false);
        lightMaterial.emissiveColor = new Color3(0.8784313725490196, 0.7568627450980392, 0.6235294117647059);
        this._lightMaterial = lightMaterial;
    }

    async load() {
        const assets = await this._loadLevel();

        // loop through meshes and enable shadows
        assets.allMeshes.forEach(element => {
            element.receiveShadows = true;
            element.checkCollisions = true;

            if (element.name == 'ground') {
                element.checkCollisions = false;
                element.isPickable = false;
            }
            // area with box collisions
            if (element.name.includes('stairs') || element.name == 'ciryentranceground' || element.name == 'fishingground.001' || element.name.includes('lilyflwr')) {
                element.checkCollisions = false;
                element.isPickable = false;
            }
            if (element.name.includes('collision')) {
                element.isVisible = false;
                element.isPickable = true;
            }
            // trigger meshes needed (?)
            if (element.name.includes('Trigger')) {
                element.isVisible = false;
                element.isPickable = false;
                element.checkCollisions = false;
            }
        });

        await this._loadSkybox();
        await this._loadOcean();
        // await this._loadFog();

        // setup lanterns in the scene
        assets.lantern.isVisible = false; // original lantern invisible 
        const lanternNode = new TransformNode('lanternHolder', this._scene);
        // mesh cloning

        for (let i = 0; i < 22; i++) {
            let lanternInstance = assets.lantern.clone('lantern ' + i);
            lanternInstance.isVisible = true;
            lanternInstance.setParent(lanternNode);

            // new lantern object
            let newLantern = new Lamp(
                this._lightMaterial,
                lanternInstance,
                this._scene,
                assets.env
                    .getChildTransformNodes(false)
                    .find(e => e.name === 'lantern ' + i)
                    .getAbsolutePosition(),
            );

            this._lampClones.push(newLantern);
        }
        // dispore original lantern
        assets.lantern.dispose();
    }

    async _loadLevel() {
        // load environment
        const result = await SceneLoader.ImportMeshAsync(null, './models/', 'level.glb', this._scene);
        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();


        // load lantern
        const lant = await SceneLoader.ImportMeshAsync('', './models/', 'lantern.glb', this._scene);
        // take root node
        let lantern = lant.meshes[0].getChildren()[0];
        // remove root to clone
        lantern.parent = null;
        lant.meshes[0].dispose();

        return {
            env, 
            allMeshes,
            lantern,
            // lampAnimationGroup
        };
    }

    async _loadSkybox() {
        let sphere = Mesh.CreateSphere('skybox', 32.0, 2000.0, this._scene);
        let material = new StandardMaterial('skybox-material', this._scene);
        material.emissiveTexture = new Texture(
            './assets/skybox-night.png',
            this._scene,
            1,
            0
        )
        material.diffuseColor = new Color3(0, 0, 0);
        material.specularColor = new Color3(0, 0, 0);
        material.emissiveTexture.uOffset = -Math.PI / 2; 
        material.emissiveTexture.uOffset = 0.1; 
        material.backFaceCulling = false;

        sphere.material = material;
    }

    async _loadOcean() {
        // ocean plane
        let oceanRGB = Color3.FromHexString('#6C7CB8');
        let oceanColor = [undefined, undefined, undefined, undefined, new Color4(oceanRGB.r, oceanRGB.g, oceanRGB.b, 1)];
        let ocean = MeshBuilder.CreateBox(
            'ground', 
            { width: 1500, height: 1, depth: 1500, faceColors: oceanColor },
            this._scene
        );
        ocean.position.y = 3.7;
        ocean.scaling = new Vector3(1, .02, 1);
        ocean.isPickable = false;
        ocean.checkCollisions = false;
    }

    async _loadFog() {
        // apply fog OPTIONAL
        this._scene.fogMode = Scene.FOGMODE_LINEAR;
        this._scene.fogStart = 30.0;
        this._scene.fogEnd = 150.0;
        this._scene.fogColor = new Color3.FromHexString('#e6f7ff');
    }

    checkLamp(player) {
        // light the first lamp
        if (!this._lampClones[0].isOn) {
            this._lampClones[0].setTexture();
        }

        this._lampClones.forEach(lamp => {
            player.mesh.actionManager.registerAction(
                new ExecuteCodeAction(
                    {
                        trigger: ActionManager.OnIntersectionEnterTrigger,
                        parameter: lamp.mesh
                    },
                    () => {
                        // turn on lamp if player hits it
                        if (!lamp.isOn) {
                            // update amount of lamps on
                            player.lampsOn += 1;
                            lamp.setTexture();
                            // reset the sparkler (?)
                            player.sparkLit = true;
                        } else if (lamp.isOn) {
                            // nothing happens if lamp is on already
                        }
                    }
                )
            );
        });
    }
}