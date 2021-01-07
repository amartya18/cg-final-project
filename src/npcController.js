import { Ray, TransformNode, Scalar, Vector3, StandardMaterial, Color3, MeshBuilder, Mesh } from "@babylonjs/core";

export class Npc extends TransformNode {

    constructor(name, assets, scene, player, engine, animationGroups) {
        // set npc name base on the array in app.js
        super(`${name}Npc`);

        // constant NPC attributes (movement speed and health)
        this.NPC_SPEED = 0.00001;
        this.HEALTH = 100;

        // assign scene and npc mesh for future use
        this.scene = scene;
        this.mesh = assets;
        this.mesh.parent = this;

        // assign player object and mesh 
        this.player = player;
        this.playerMesh = player.mesh;

        // store original position to know where to move back when player is out of range
        this.originalPosition = this.mesh.position.clone();

        // setup npc healthbar
        this._healthBar();

        // stop default animation
        animationGroups[0].stop();

        // npc moves animations
        this._attack = animationGroups[0];
        this._idle = animationGroups[1];
        this._walk = animationGroups[2];

        // attack state
        this.previousAttack = false;
        this.currentAttack = false;

        // animation setup
        this._prepareAnimation();
    }

    _prepareAnimation() {
        // setup animation state
        this._walk.loopAnimation = true;
        this._idle.loopAnimation = true;
        this.currentAnimation = this._idle;
        this.previousAnimation = this._walk;

        // listener, when npc attack reduce player health
        this._attack.onAnimationGroupLoopObservable.add(() => {
            this.player.HEALTH -= 5; // reduce player's health
        });
    }

    _runAnimation() {
        // execute whatever animation is stored in this.currentAnimation
        if (this.createAnimationRange !== null && this.previousAnimation !== this.currentAnimation) {
            this.previousAnimation.stop();
            this.currentAnimation.play(this.currentAnimation.loopAnimation);
            this.previousAnimation = this.currentAnimation;
        }
    }

    // npc movement
    _updateFromControls() {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;
        // initial direction (stary in place)
        this._direction = Vector3.Zero();

        // get vector3 of player's position 
        let targetPosition = this._checkPlayer();

        // if player detected
        if (targetPosition) {
            // look at the player direction
            this.mesh.lookAt(new Vector3(targetPosition.x, this.mesh.position.y, targetPosition.z));

            // calculate absolute difference of player position vector and npc position vector
            let dist = Vector3.Distance(targetPosition, this.mesh.position);

            // if the distance is too far to attack but in range
            if (dist > 3.5) {
                // move forward to player
                this.vertical = Scalar.Lerp(this.vertical, 0.75, .01);
                this.verticalAxis = 1;
                let forward = this.mesh.forward;
                let scaledVertical = forward.scaleInPlace(this.vertical);

                // npc move based on this._direction vector
                this._direction = new Vector3(scaledVertical.x, 0, scaledVertical.z);

                // play walk animation while moving forward
                this.currentAnimation = this._walk;
            } else {
                // when it is in melee distance

                // stop moving
                this._direction = Vector3.Zero();

                // attack the player and play the animation
                this.currentAnimation = this._attack;

                // change attack state
                this.currentAttack = this.player.attacking;

                // if the player attacks npc
                if (this.currentAttack !== this.previousAttack) {
                    this.previousAttack = this.currentAttack;
                    this.HEALTH -= 20; // reduce npc health by 20
                }
            }
        } else {
            // if player is out of range

            this.vertical = 0;
            this.verticalAxis = 0;

            // check the distance of the NPC from the original position
            let dist = Vector3.Distance(this.mesh.position, this.originalPosition);

            // if it is far enough from the original position
            if (dist > .5) {
                // look towards the original position
                this.mesh.lookAt(this.originalPosition);

                // and move towards the original position
                this.verticalBack = Scalar.Lerp(this.vertical, 0.75, .1);
                this.verticalAxis = 1;
                let forwardBack = this.mesh.forward;
                let scaledVerticalBack = forwardBack.scaleInPlace(this.verticalBack);

                this._direction = new Vector3(scaledVerticalBack.x, 0, scaledVerticalBack.z);
            } 
        }
    }

    // check player if close to npc
    _checkPlayer() {
        // calculate absolute difference of original position vecgtor to player mesh to know if player is close
        const dist = Vector3.Distance(this.originalPosition, this.playerMesh.position);
        if (dist < 15) {
            // calculate if the player is in the same platform / level
            // player might be close but above the npc
            const yDistance = Math.abs(this.originalPosition.y - this.playerMesh.position.y);
            // if it is not above or on a different level / higher platform of the game 
            // then return the player position indicating NPC detect player
            if (yDistance < 2) {
                return this.playerMesh.position;
            }
        } else {
            return null;
        }
    }

    // check NPC life status
    _deadOrAlive() {
        // if dead
        if (this.HEALTH === 0) {
            // play animation and dispose
            this.currentAnimation = this._idle;
            this.dispose();
            // add player npc counter
            this.player.npcDefeated += 1;
            // set health to -1 
            this.HEALTH = -1;
        }
    }

    // setup npc health bar
    _healthBar() {
        // material for first plane
        let hBarMat = new StandardMaterial('hBarMat');
        hBarMat.diffuseColor = Color3.Green();
        hBarMat.backFaceCulling = false;

        // material for second plane (the container)
        let hBarMatContainer = new StandardMaterial('hBarMatContainer')
        hBarMatContainer.diffuseColor = Color3.Blue();
        hBarMatContainer.backFaceCulling = false;

        // create 2 planes
        let hBarContainer = MeshBuilder.CreatePlane('hBarContainer', { width: 2, height: .3, subdivisions: 4 }, this.scene);
        let healthbar = MeshBuilder.CreatePlane('healthbar', { width: 2, height: .3, subdivisions: 4}, this.scene);

        hBarContainer.billboardMode = Mesh.BILLBOARDMODE_ALL;

        healthbar.renderingGroupId = 1;
        hBarMatContainer.renderingGroupId = 1;

        // set healthbar (which indicates the npc health) as the child of the container (the health barbackground)
        healthbar.parent = hBarContainer;

        // set container as child of npc mesh to always follow the npc movement
        hBarContainer.parent = this.mesh;

        // make sure healt bar is on top of npc mesh not on the npc mesh
        hBarContainer.position.y += 4 // 3

        // apply the materials defined before
        healthbar.material = hBarMat;
        hBarContainer.material = hBarMatContainer;

        // assign the planes to use in _updateHealthBar()
        this.hBarMat = hBarMat;
        this.hBarMatContainer = hBarMatContainer;
        this.hBarContainer = hBarContainer;
        this.healthbar = healthbar;
    }

    _updateHealthBar() {
        let currentHealth = this.HEALTH
        // if healthbar is above 0 (npc still alive)
        if (currentHealth > 0) {
            // change the scale / size of the healthbar based on the npc health percentage
            this.healthbar.scaling.x = currentHealth / 100;
            // set the position to left align based on npc health
            this.healthbar.position.x = (1 - (currentHealth / 100)) * -1;

            // player dead set health to -1
            if (this.healthbar.scaling.x < 0) {
                this.HEALTH = -1; // npc dead
            } else if (this.healthbar.scaling.x < .5) {
                // player health is below 50 percent change healthbar color to red
                this.hBarMat.diffuseColor = Color3.Red();
            } else if (this.healthbar.scaling.x < .7) {
                // player health is below 75 percent change healthbar color to yellow
                this.hBarMat.diffuseColor = Color3.Yellow();
            }
        }
    }

    _beforeRenderUpdate() {
        this._updateFromControls();

        // move mesh based on the this._direction state
        if (this._direction !== null) {
            this.mesh.moveWithCollisions(this._direction);
        }

        // call all the relevant NPC functions
        this._runAnimation();
        this._updateHealthBar();
        this._deadOrAlive();
    }

    _activeNPC() {
        // activate the npc functions to the scene
        this.scene.registerBeforeRender(() => {
            this._beforeRenderUpdate();
        });
    }
}