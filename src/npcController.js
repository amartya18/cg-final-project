import { ArcFollowCamera, ArcRotateCamera, Quaternion, Ray, TransformNode, Scalar, Vector3, StandardMaterial, Color3, DynamicTexture, MeshBuilder, Mesh } from "@babylonjs/core";

export class Npc extends TransformNode {

    constructor(name, assets, scene, player, engine, animationGroups) {
        super(`${name}Npc`);
        this.NPC_SPEED = 0.00001;
        this.HEALTH = 100;

        this.scene = scene;
        // this._setupPlayerCamera(canvas);

        this.mesh = assets;
        this.mesh.parent = this;

        this.player = player;
        this.playerMesh = player.mesh;

        this.originalPosition = this.mesh.position.clone();

        // setup npc healthbar
        this._healthBar();

        // animationGroups
        // stop default animation
        animationGroups[0].stop();

        // npc moves
        this._attack = animationGroups[0];
        this._idle = animationGroups[1];
        this._walk = animationGroups[2];

        this.previousAttack = false;
        this.currentAttack = false;

        // this.attack.play(true);
        this._prepareAnimation();
    }

    _prepareAnimation() {
        this._walk.loopAnimation = true;
        this._idle.loopAnimation = true;
        this.currentAnimation = this._idle;
        this.previousAnimation = this._walk;

        // listener, when npc attack reduce player health
        this._attack.onAnimationGroupLoopObservable.add(() => {
            // reduce player's health
            this.player.HEALTH -= 5;
        });
    }

    _runAnimation() {
        if (this.createAnimationRange !== null && this.previousAnimation !== this.currentAnimation) {
            this.previousAnimation.stop();
            this.currentAnimation.play(this.currentAnimation.loopAnimation);
            this.previousAnimation = this.currentAnimation;
        }
        if (this.currentAnimation === this._attack) {}
    }

    _updateFromControls() {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

        this._direction = Vector3.Zero();

        // get vector 3 of player's position with ray
        // this._direction = this._checkPlayerNaive();

        let targetPosition = this._checkPlayerNaive();


        if (targetPosition) {
            this.mesh.lookAt(new Vector3(targetPosition.x, this.mesh.position.y, targetPosition.z));
            // this.mesh.lookAt(targetPosition);

            let dist = Vector3.Distance(targetPosition, this.mesh.position);
            if (dist > 3.5) {
                // move forward to player
                this.vertical = Scalar.Lerp(this.vertical, 0.75, .01);
                this.verticalAxis = 1;

                let forward = this.mesh.forward;
                let scaledVertical = forward.scaleInPlace(this.vertical);

                this._direction = new Vector3(scaledVertical.x, 0, scaledVertical.z);
                // play walk animation here 
                this.currentAnimation = this._walk;
            } else {
                this._direction = Vector3.Zero();
                // attack here!
                this.currentAnimation = this._attack;

                this.currentAttack = this.player.attacking;
                // if player attacks npc
                if (this.currentAttack !== this.previousAttack) {
                    this.previousAttack = this.currentAttack;
                    this.HEALTH -= 20;
                }
            }


        } else {
            // look at original spot and move back
            this.vertical = 0;
            this.verticalAxis = 0;

            let dist = Vector3.Distance(this.mesh.position, this.originalPosition);
            if (dist > .5) {
                this.mesh.lookAt(this.originalPosition);

                // move forward to original position; refactor
                this.verticalBack = Scalar.Lerp(this.vertical, 0.75, .1);
                this.verticalAxis = 1;

                let forwardBack = this.mesh.forward;
                let scaledVerticalBack = forwardBack.scaleInPlace(this.verticalBack);

                this._direction = new Vector3(scaledVerticalBack.x, 0, scaledVerticalBack.z);
            } // else if collision with player
        }


        // if (this.vertical) {

            // move

            // make the movement less clunky and set speed

            // // // FIGURE OUT ROTATION (horizontalAxis and verticalAxis)
            // let input = new Vector3(0, 0, this._input.verticalAxis);
            // // no input detected prevent rotation
            // if (input.length() == 0) {
            //     return;
            // }

            // // rotation based on input (and camera angle(?))
            // let angle = Math.atan2(0, this._input.verticalAxis);
            // angle += this._npcRoot.rotation.y;
            // let target = Quaternion.FromEulerAngles(0, angle, 0);
            // this.mesh.rotationQuaternion = Quaternion.Slerp(this.mesh.rotationQuaternion, target, 10 * this._deltaTime);

        // }
    }

    _checkPlayerNaive() {
        const dist = Vector3.Distance(this.originalPosition, this.playerMesh.position);
        if (dist < 15) {
            const yDistance = Math.abs(this.originalPosition.y - this.playerMesh.position.y);
            if (yDistance < 2) {
                return this.playerMesh.position;
            }
        } else {
            return null;
        }
    }

    // prevent from falling
    // check is grounded ahead before falling
    _groundRaycast(offsetx, offsetz, raycastlen) {
        // send single raycast down to detect ground
        let raycastGroundPosition = new Vector3(this.mesh.position.x + offsetx, this.mesh.position.y + 0.5, this.mesh.position.z + offsetz);
        let ray = new Ray(raycastGroundPosition, Vector3.Up().scale(-1), raycastlen);

        let predict = function (mesh) {
            return mesh.isPickable && mesh.isEnabled;
        };
        let pick = this.scene.pickWithRay(ray, predict);

        if (pick.hit) {
            return pick.pickedPoint;
        } else {
            return Vector3.Zero();
        }
    }

    // is player on ground
    _isGrounded() {
        // offsetx = 1 to check npc ground before falling
        if (this._groundRaycast(1, 0, 0.6).equals(Vector3.Zero())) {
            return false;
        } else {
            return true;
        }
    }

    _deadOrAlive() {
        if (this.HEALTH === 0) {
            // dead animation and dispose
            this.currentAnimation = this._idle;
            this.dispose();
            this.player.npcDefeated += 1;
            // funky way to dispose
            this.HEALTH = -1;
        }
    }

    _healthBar() {
        let hBarMat = new StandardMaterial('hBarMat');
        hBarMat.diffuseColor = Color3.Green();
        hBarMat.backFaceCulling = false;

        let hBarMatContainer = new StandardMaterial('hBarMatContainer')
        hBarMatContainer.diffuseColor = Color3.Blue();
        hBarMatContainer.backFaceCulling = false;

        let hBarContainer = MeshBuilder.CreatePlane('hBarContainer', { width: 2, height: .3, subdivisions: 4 }, this.scene);
        let healthbar = MeshBuilder.CreatePlane('healthbar', { width: 2, height: .3, subdivisions: 4}, this.scene);

        hBarContainer.billboardMode = Mesh.BILLBOARDMODE_ALL;

        healthbar.renderingGroupId = 1;
        hBarMatContainer.renderingGroupId = 1;

        healthbar.parent = hBarContainer;
        hBarContainer.parent = this.mesh;

        // healthbar.position.z -= 0.01
        hBarContainer.position.y += 4 // 3

        healthbar.material = hBarMat;
        hBarContainer.material = hBarMatContainer;

        this.hBarMat = hBarMat;
        this.hBarMatContainer = hBarMatContainer;
        this.hBarContainer = hBarContainer;
        this.healthbar = healthbar;
    }

    _updateHealthBar() {
        let currentHealth = this.HEALTH
        if (currentHealth > 0) {
            this.healthbar.scaling.x = currentHealth / 100;
            this.healthbar.position.x = (1 - (currentHealth / 100)) * -1;

            if (this.healthbar.scaling.x < 0) {
                this.HEALTH = -1; // npc dead
            } else if (this.healthbar.scaling.x < .5) {
                this.hBarMat.diffuseColor = Color3.Red();
            } else if (this.healthbar.scaling.x < .7) {
                this.hBarMat.diffuseColor = Color3.Yellow();
            }
        }
    }

    _beforeRenderUpdate() {
        this._updateFromControls();
        // console.log(this.tempEngine.getFps());

        if (this._direction !== null) {
            this.mesh.moveWithCollisions(this._direction);
        }

        this._runAnimation();
        this._updateHealthBar();
        this._deadOrAlive();
    }

    _activeNPC() {
        // loops game time
        this.scene.registerBeforeRender(() => {
            this._beforeRenderUpdate();
        });
    }
}