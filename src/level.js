import { Mesh, SceneLoader, MeshBuilder, StandardMaterial, Texture, Vector3, Color3, Color4, Scene, TransformNode, ExecuteCodeAction, ActionManager, PBRMetallicRoughnessMaterial, AnimationGroup } from "@babylonjs/core";
import { Lamp } from './lamp';

export class Level {
    constructor(scene) {
        // assign passed scene for future use
        this._scene = scene;

        // to store 22 lamp clones
        this._lampClones = [];

        // load lampOn materal to pass it into lamp 
        const lightMaterial = new PBRMetallicRoughnessMaterial('lamp light', this._scene);
        lightMaterial.emissiveTexture = new Texture('./textures/lampOn.png', this._scene, true, false);
        lightMaterial.emissiveColor = new Color3(0.8, 0.7, 0.6);
        this._lightMaterial = lightMaterial;
    }

    async load() {
        const assets = await this._loadLevel();

        // loop through meshes 
        assets.allMeshes.forEach(element => {
            // enable shadow for all meshes
            element.receiveShadows = true;
            element.checkCollisions = true;

            // set ground collision and isPickable
            if (element.name == 'ground') {
                element.checkCollisions = false;
                element.isPickable = false;
            }
            // area with box collisions
            if (element.name.includes('stairs') || element.name == 'ciryentranceground' || element.name == 'fishingground.001' || element.name.includes('lilyflwr')) {
                element.checkCollisions = false;
                element.isPickable = false;
            }
            // area acts as checkpoints, not visible but isPickable
            if (element.name.includes('collision')) {
                element.isVisible = false;
                element.isPickable = true;
            }
            if (element.name.includes('Trigger')) {
                element.isVisible = false;
                element.isPickable = false;
                element.checkCollisions = false;
            }
        });

        // load skybox and ocean to the map
        await this._loadSkybox();
        await this._loadOcean();

        // decided not to use fog because of aestethics, but it is possible to have a realistic fog effect
        // uncomment below to try it out
        // await this._loadFog();

        // setup lamp holder
        assets.lantern.isVisible = false; // original lantern invisible 
        const lanternNode = new TransformNode('lanternHolder', this._scene);

        // clone lamp mesh
        for (let i = 0; i < 22; i++) {
            let lanternInstance = assets.lantern.clone('lantern ' + i);
            lanternInstance.isVisible = true;
            lanternInstance.setParent(lanternNode);

            // new lantern object, and pass in the lampOn material, clone instance, and position
            let newLantern = new Lamp(
                this._lightMaterial,
                lanternInstance,
                this._scene,
                assets.env
                    .getChildTransformNodes(false)
                    .find(e => e.name === 'lantern ' + i)
                    .getAbsolutePosition(),
            );

            // store all lanterns to an array
            this._lampClones.push(newLantern);
        }

        // dispore original lantern
        assets.lantern.dispose();
    }

    async _loadLevel() {
        // load game map / level
        const result = await SceneLoader.ImportMeshAsync(null, './models/', 'level.glb', this._scene);
        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();

        // load lantern mesh from GLB file that is going to be cloned
        const lant = await SceneLoader.ImportMeshAsync('', './models/', 'lantern.glb', this._scene);
        let lantern = lant.meshes[0].getChildren()[0];
        lantern.parent = null;
        lant.meshes[0].dispose();

        // return level with all of its meshes and lantern mesh
        return {
            env, 
            allMeshes,
            lantern,
        };
    }

    // load skybox
    async _loadSkybox() {
        // create sphere
        let sphere = Mesh.CreateSphere('skybox', 32.0, 2000.0, this._scene);
        // texture the sphere
        let material = new StandardMaterial('skybox-material', this._scene);
        material.emissiveTexture = new Texture(
            './assets/skybox-night.png',
            this._scene,
            1,
            0
        )
        // set color, texture efefct and face culling
        material.diffuseColor = new Color3(0, 0, 0);
        material.specularColor = new Color3(0, 0, 0);
        material.emissiveTexture.uOffset = -Math.PI / 2; 
        material.emissiveTexture.uOffset = 0.1; 
        material.backFaceCulling = false;

        // assign texture / material to the sphere
        sphere.material = material;
    }

    async _loadOcean() {
        // pick a blue color
        let oceanRGB = Color3.FromHexString('#6C7CB8');
        let oceanColor = [undefined, undefined, undefined, undefined, new Color4(oceanRGB.r, oceanRGB.g, oceanRGB.b, 1)];
        // create box mesh with in a big size so it looks like an ocean
        let ocean = MeshBuilder.CreateBox(
            'ground', 
            { width: 1500, height: 1, depth: 1500, faceColors: oceanColor },
            this._scene
        );
        // setup position, size, collision, and isPickable
        ocean.position.y = 3.7;
        ocean.scaling = new Vector3(1, .02, 1);
        ocean.isPickable = false;
        ocean.checkCollisions = false;
    }

    // optional fog
    async _loadFog() {
        // specify type of fog
        this._scene.fogMode = Scene.FOGMODE_LINEAR;
        // start and end fog radius / range
        this._scene.fogStart = 30.0;
        this._scene.fogEnd = 150.0;
        // color of fog
        this._scene.fogColor = new Color3.FromHexString('#e6f7ff');
    }

    // check if a player hits the lamp
    checkLamp(player) {
        // light the first lamp since it is where the player starts
        if (!this._lampClones[0].isOn) {
            this._lampClones[0].setTexture();
        }

        // check for collision with ActionManager
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
                            player.lampsOn += 1; // update the lampsOn state for game HUD
                            lamp.setTexture(); // set texture to enable lamp on effeect (texture and pointlight)
                            player.sparkLit = true;
                        } 
                    }
                )
            );
        });
    }
}