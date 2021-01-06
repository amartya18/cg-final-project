import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";

import {
    Engine, 
    Scene, 
    ArcRotateCamera, 
    Vector3, 
    Vector4, 
    HemisphericLight, 
    PointLight,
    Mesh, 
    MeshBuilder, 
    Color3, 
    FreeCamera,
    Matrix,
    ShadowGenerator,
    Quaternion,
    StandardMaterial,
    SceneLoader,
    BoundingBox,
    TransformNode,
    Texture
} from "@babylonjs/core";
import {
    AdvancedDynamicTexture,
    Button,
    Control,
    Rectangle,
    TextBlock,
    Image
} from '@babylonjs/gui'

import { Level } from "./level";
import { Player } from "./playerController";
import { PlayerMovement } from "./playerMovement";
import { Npc } from "./npcController";
import { GameHud } from "./gameHud";

// states in the game
const State = {
    START: 0,
    GAME: 1,
    LOSE: 2,
    CUTSCENE: 3,
    INSTRUCTIONS: 4,
}

class App {
    constructor() {
        this._canvas = this._createCanvas();

        // init engine and scene 
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine, true);

        // current scene
        this._state = 0;

        // inspector
        window.addEventListener('keydown', (ev) => {
            // shift option i => babylon debugger
            if (ev.shiftKey && ev.ctrlKey && ev.keyCode === 73) {
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        });

        this._main();
    }

    _createCanvas() {
        // for dev server
        document.documentElement.style["overflow"] = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        document.documentElement.style.margin = "0";
        document.documentElement.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        // create canvas and attach it
        this._canvas = document.createElement('canvas');
        this._canvas.style.width = '100%';
        this._canvas.style.height = '100%';
        this._canvas.id = 'mainCanvas';
        document.body.appendChild(this._canvas);

        return this._canvas;
    }

    async _main() {
        await this._goToStart();

        // render loop to render the scene
        this._engine.runRenderLoop(() => {
            switch (this._state) {
                case State.START:
                    this._scene.render();
                    break;
                case State.CUTSCENE:
                    this._scene.render();
                    break;
                case State.INSTRUCTIONS:
                    this._scene.render();
                    break;
                case State.GAME:
                    this._scene.render();
                    break;
                case State.LOSE:
                    this._scene.render();
                    break;
                default: break;
            }
        });

        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

    async _goToStart() {
        this._engine.displayLoadingUI();

        // create scene and fixed camera
        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color3.FromHexString('#4079CA');
        let camera = new FreeCamera('camera1', new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero())

        // CREATE GUI
        // ----------

        // fullscreen ui
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI('UI');
        guiMenu.idealHeight = 720;

        const container = new Rectangle('menuContainer');
        // remove white border
        container.thickness = 0;
        container.width = 0.5;
        guiMenu.addControl(container);

        const titleMenu = new Image('titleMenu', './assets/StartMenu.png');
        titleMenu.width= '60%';
        titleMenu.stretch = Image.STRETCH_UNIFORM;
        container.addControl(titleMenu);

        // sub-text
        const subText = new TextBlock('subText');
        subText.text = '3D Platformer';
        subText.color = 'white';
        subText.top = '80px'
        subText.fontSize = '20px';
        container.addControl(subText);

        // button
        const startBtn = Button.CreateSimpleButton('start', 'PLAY');
        startBtn.width = 0.4;
        startBtn.height = '40px';
        startBtn.color = 'white';
        startBtn.top = '150px';
        container.addControl(startBtn);


        // button handler
        startBtn.onPointerDownObservable.add(() => {
            this._goToInstructions();
        })
        // ----------

        // scene finised loading
        await scene.whenReadyAsync(); // AWAIT ERROR
        this._engine.hideLoadingUI();

        // change/set state
        this._scene.dispose();
        this._scene = scene;
        this._state = State.START;
    }

    async _goToInstructions() {
        // setup instructions scene
        this._engine.displayLoadingUI();
        this._scene.detachControl();
        this._instructions = new Scene(this._engine);
        let camera = new FreeCamera('camera1', new Vector3(0, 0, 0), this._instructions);
        camera.setTarget(Vector3.Zero());
        this._instructions.clearColor = new Color3.FromHexString('#4079CA');

        const instructionsUI = AdvancedDynamicTexture.CreateFullscreenUI('instructions');
        instructionsUI.idealHeight = 720;

        const container = new Rectangle('instructionsContainer');
        // remove white border
        container.thickness = 0;
        container.width = 0.5;
        instructionsUI.addControl(container);

        const instructionsPNG = new Image('titleMenu', './assets/instructions.png');
        instructionsPNG.width= '100%';
        instructionsPNG.stretch = Image.STRETCH_UNIFORM;
        container.addControl(instructionsPNG);

        // button
        const btn = Button.CreateSimpleButton("next", "NEXT");
        btn.color = "white";
        btn.thickness = 0;
        btn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        btn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        btn.width = "64px";
        btn.height = "64px";
        btn.top = "-3%";
        btn.left = "-12%";
        instructionsUI.addControl(btn);

        await this._instructions.whenReadyAsync();
        this._engine.hideLoadingUI();
        this._scene.dispose();
        this._state = State.INSTRUCTIONS;
        this._scene = this._instructions;

        btn.onPointerUpObservable.add(() => {
            this._goToCutScene();
        })
    }

    async _goToCutScene() {
        this._engine.displayLoadingUI();
        // SETUP SCENE
        // dont take in inputs while game is loading
        this._scene.detachControl();
        this._cutScene = new Scene(this._engine);
        let camera = new FreeCamera('camera1', new Vector3(0, 0, 0), this._cutScene);
        camera.setTarget(Vector3.Zero());
        this._cutScene.clearColor = new Color3.FromHexString('#4079CA');

        // GUI
        const cutScene = AdvancedDynamicTexture.CreateFullscreenUI('cutscene');

        const container = new Rectangle('menuContainer');
        container.thickness = 0; // remove white border
        container.width = 0.5;
        cutScene.addControl(container);

        const loadingText = new TextBlock('loadingText');
        loadingText.text = 'Loading...'
        loadingText.fontSize = '50';
        loadingText.color = 'white';
        container.addControl(loadingText);

        //--WHEN SCENE IS FINISHED LOADING--
        await this._cutScene.whenReadyAsync();
        this._engine.hideLoadingUI();
        this._scene.dispose();
        this._state = State.CUTSCENE;
        this._scene = this._cutScene;

        //--START LOADING AND SETTING UP THE GAME DURING THIS SCENE--
        let finishedLoading = false;
        await this._setUpGame().then(res => {
            finishedLoading = true;
            this._goToGame();
        });
    }

    async _setUpGame() {
        let scene = new Scene(this._engine);
        this._gamescene = scene;

        // load assets
        const level = new Level(scene);
        this._level = level;
        await this._level.load();
        await this._loadPlayerAssets(scene);
        // load npc asset
        await this._loadNPCAssets(scene);
    }

    async _loadPlayerAssets(scene) {
        async function loadPlayer() {
            // create collider for the collision mesh of player
            const outer = MeshBuilder.CreateBox('outer', { width: 2, depth: 1, height: 3 }, scene);
            outer.isVisible = false;
            outer.isPickable = false;
            outer.checkCollisions = true;

            // move box collider to the bottom to match player mesh
            outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

            // for collisions (?)
            outer.ellipsoid = new Vector3(1, 1.5, 1);
            outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

            outer.rotationQuaternion = new Quaternion(0, 1, 0, 0) // back of the player

            return SceneLoader.ImportMeshAsync(null, './models/', 'RogueFix.glb', scene).then((res) => {
                // console.log(res);
                const root = res.meshes[0];
                // actual player mesh
                const body = root;
                body.parent = outer;
                // prevent self raycast
                body.isPickable = false;
                body.getChildMeshes().forEach(element => {
                    element.isPickable = false;
                });

                // let rougeDaggerTexture = new StandardMaterial('Rouge_Dagger_Texture', this._scene);

                return {
                    mesh: outer,
                    animationGroups: res.animationGroups
                }
            });

        }

        return loadPlayer().then((assets) => {
            this.assets = assets;
        })
    }

    async _loadNPCAssets(scene) {
        let npcsName = ['snake1', 'snake2', 'snake3'];

        let npcsPos = [
            new Vector3(-55, 13, 132),
            new Vector3(-0.12, 30, 19.83),
            new Vector3(20, 17, 41),
        ];

        // this._npcsAsset = {};
        let npc = null;

        for (let i = 0; i < npcsName.length; i++) {
            const element = npcsName[i];
            
            const outer = MeshBuilder.CreateBox(`${element}Outer`, { width: 2, height: 3, depth: 3 }, scene);
            outer.bakeTransformIntoVertices(Matrix.Translation(0, 1, 0));
            outer.position = npcsPos[i];
            outer.isVisible = false;
            // cant collide
            outer.isPickable = false;
            outer.checkCollisions = true;

            SceneLoader.ImportMeshAsync(null, './models/', `snake.glb`, scene).then((res) => {
                // mesh root node
                res.meshes[0].parent = outer;
                npc = new Npc(element, outer, scene, this._player, this._engine, res.animationGroups);
                npc._activeNPC();
            });

            outer.position = npcsPos[i];
            // this._npcsAsset[element] = outer;
        }
    }

    async _initGameAsync(scene) {
        // level lighting
        var light0 = new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene);
        const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
        light.diffuse = new Color3(0.08, 0.109, 0.1529);
        light.intensity = 35;
        light.radius = 1;

        const shadowGenerator = new ShadowGenerator(1024, light);
        shadowGenerator.darkness = 0.4;

        //Create the player
        this._player = new Player(this.assets, scene, shadowGenerator, this._input, this._canvas); //dont have inputs yet so we dont need to pass it in
        const camera = this._player._activePlayerCamera();

        // lamp collision check
        this._level.checkLamp(this._player);

        // main game loop
        scene.onBeforeRenderObservable.add(() => {
            // if a lamp is turned on
            if (this._player.sparkLit) {
                this._gameUi._updateLamp(this._player.lampsOn);
                this._player.sparkLit = false;
            }
            // update health bar state here
            this._gameUi._updateNpcDefeated(this._player.npcDefeated);
            this._gameUi._updatePlayerHealth(this._player.HEALTH);

            if (this._player.winGame) {
                // go to win scene
                console.log('player win!')
                this._goToWin();
            }
            if (this._player.loseGame) {
                this._goToLose();
            }
        });
    }

    async _goToGame() {
        //--SETUP SCENE--
        this._scene.detachControl();
        let scene = this._gamescene;
        // temp color for sky

        //--GUI--
        const gameUi = new GameHud();
        this._gameUi = gameUi;
        // control wont reattach with attachControl() for some reason
        // scene.detachControl();

        this._input = new PlayerMovement(scene, this._gameUi);

        // main game here
        await this._initGameAsync(scene);

        //--WHEN SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        // move player to start position
        scene.getMeshByName('outer').position = scene.getTransformNodeByName('startPosition').getAbsolutePosition();

        //get rid of start scene, switch to gamescene and change states
        this._scene.dispose();
        this._state = State.GAME;
        this._scene = scene;
        this._engine.hideLoadingUI();
        //the game is ready, attach control back
        // this._scene.attachControl();

        // play game song here
    }

    async _goToLose() {
        this._engine.displayLoadingUI();

        //--SCENE SETUP--
        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color3.FromHexString('#4079CA');
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());

        //--GUI--
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const mainBtn = Button.CreateSimpleButton("mainmenu", "YOU LOSE");
        mainBtn.width = 0.2;
        mainBtn.height = "40px";
        mainBtn.color = "white";
        guiMenu.addControl(mainBtn);
        //this handles interactions with the start button attached to the scene
        mainBtn.onPointerUpObservable.add(() => {
            this._goToStart();
        });

        //--SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI(); //when the scene is ready, hide loading
        //lastly set the current state to the lose state and set the scene to the lose scene
        this._scene.dispose();
        this._scene = scene;
        this._state = State.LOSE;
    }

    async _goToWin() {
        this._engine.displayLoadingUI();

        //--SCENE SETUP--
        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color3.FromHexString('#4079CA');
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());

        //--GUI--
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const mainBtn = Button.CreateSimpleButton("winmenu", "You Win!");
        mainBtn.width = 0.2;
        mainBtn.height = "40px";
        mainBtn.color = "white";
        guiMenu.addControl(mainBtn);
        //this handles interactions with the start button attached to the scene
        mainBtn.onPointerUpObservable.add(() => {
            this._goToStart();
        });

        //--SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI(); //when the scene is ready, hide loading
        //lastly set the current state to the lose state and set the scene to the lose scene
        this._scene.dispose();
        this._scene = scene;
        this._state = State.LOSE;
    }
}


new App();