import { PlaneRotationGizmo } from '@babylonjs/core';
import {
    AdvancedDynamicTexture,
    TextBlock,
    Control,
    Rectangle,
    PlanePanel
} from '@babylonjs/gui'


export class GameHud {
    constructor(scene) {
        this._scene = scene;

        const gameUI = AdvancedDynamicTexture.CreateFullscreenUI('ui');
        this._gameUI = gameUI;
        this._gameUI.idealHeight = 720;

        this.npcDefeatedCount = 0;
        this.playerHealth = 100;

        // lamp counter
        const lampCount = new TextBlock();
        lampCount.name = 'lamp turned on';
        lampCount.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_CENTER;
        lampCount.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        lampCount.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        lampCount.fontSize = "22px";
        lampCount.color = "white";
        lampCount.text = "🏮 Lamps: 1 / 22";
        lampCount.top = "32px";
        lampCount.left = "-64px";
        lampCount.width = "25%";
        lampCount.fontFamily = "Tomorrow";
        lampCount.resizeToFit = true;
        gameUI.addControl(lampCount);
        this._lampCount = lampCount;

        // npc counter
        const npcCount = new TextBlock();
        npcCount.name = 'enemy defeated';
        npcCount.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_CENTER;
        npcCount.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        npcCount.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        npcCount.fontSize = "22px";
        npcCount.color = "white";
        npcCount.text = "🐍 Enemy: 0 / 3";
        npcCount.top = "59px";
        npcCount.left = "-64px";
        npcCount.width = "25%";
        npcCount.fontFamily = "Tomorrow";
        npcCount.resizeToFit = true;
        gameUI.addControl(npcCount);
        this._npcCount = npcCount;

        // this._setupPlayerHealth();
        // player health bar
        const playerHealth = new TextBlock();
        playerHealth.width = "25%";
        playerHealth.text = '❤️ 100 / 100';
        playerHealth.color = 'red';
        playerHealth.fontSize = '25px';
        // playerHealth.sourceWidth = 36;
        // playerHealth.sourceHeight = 108;
        playerHealth.verticalAlignment = 0;
        playerHealth.horizontalAlignment = 0;
        playerHealth.left = "0";
        playerHealth.top = "0";
        gameUI.addControl(playerHealth);
        this._playerHealth = playerHealth;


        this.gameUI = gameUI;
    }

    _updateHud() {}

    _updateLamp(lampsCount) {
        this._lampCount.text = '🏮 Lamp: ' + lampsCount + " / 22";
    }

    _updateNpcDefeated(npcDefeatedCount) {
        if (npcDefeatedCount > this.npcDefeatedCount) {
            this.npcDefeatedCount = npcDefeatedCount;
            this._npcCount.text = '🐍 Enemy defeated: ' + npcDefeatedCount + ' / 3';
        }
    }

    _setupPlayerHealth() {}

    _updatePlayerHealth(playerHealth) {
        this.playerHealth = playerHealth;
        if (playerHealth < 0) {
            this._playerHealth.text = '❤️ 0 / 100';
        } else {
            this._playerHealth.text = '❤️ ' + playerHealth + ' / 100';
        }
        if (playerHealth < 25) {
            this._playerHealth.color = 'white';
        } else if (playerHealth < 65) {
            this._playerHealth.color = 'yellow';
        }
    }
}