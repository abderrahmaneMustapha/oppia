// Copyright 2018 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Unit tests for StoryEditorStateService.
 */

import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { Subscription } from 'rxjs';

import { StoryObjectFactory } from 'domain/story/StoryObjectFactory';
import { EditableStoryBackendApiService } from 'domain/story/editable-story-backend-api.service';
import { StoryEditorStateService } from 'pages/story-editor-page/services/story-editor-state.service';
import { importAllAngularServices, TranslatorProviderForTests } from 'tests/unit-test-utils.ajs';
import { AlertsService } from 'services/alerts.service';

require('domain/story/story-update.service.ts');

class MockEditableStoryBackendApiService {
  newBackendStoryObject = null;
  failure = null;

  async fetchStoryAsync() {
    return new Promise((resolve, reject) => {
      if (!this.failure) {
        resolve({
          story: this.newBackendStoryObject,
          topicName: 'Topic Name',
          storyIsPublished: false,
          skillSummaries: [{
            id: 'Skill 1',
            description: 'Skill Description'
          }],
          classroomUrlFragment: 'classroomUrlFragment',
          topicUrlFragment: 'topicUrlFragment'
        });
      } else {
        reject();
      }
    });
  }

  async updateStoryAsync() {
    return new Promise((resolve, reject) => {
      if (!this.failure) {
        resolve(this.newBackendStoryObject);
      } else {
        reject();
      }
    });
  }

  async changeStoryPublicationStatusAsync() {
    return new Promise((resolve, reject) => {
      if (!this.failure) {
        resolve({});
      } else {
        reject();
      }
    });
  }

  async doesStoryWithUrlFragmentExistAsync() {
    return new Promise((resolve, reject) => {
      if (!this.failure) {
        console.error('test');
        resolve(false);
      } else {
        reject();
      }
    });
  }
}

describe('Story editor state service', () => {
  var alertsService = null;
  var storyEditorStateService = null;
  var storyObjectFactory = null;
  var storyUpdateService = null;
  var fakeEditableStoryBackendApiService = null;
  var secondBackendStoryObject = null;
  var testSubscriptions: Subscription;

  importAllAngularServices();

  const storyInitializedSpy = jasmine.createSpy('storyInitialized');
  const storyReinitializedSpy = jasmine.createSpy('storyReinitialized');

  beforeEach(
    angular.mock.module('oppia', TranslatorProviderForTests));

  beforeEach(() => {
    fakeEditableStoryBackendApiService = (
      new MockEditableStoryBackendApiService());

    fakeEditableStoryBackendApiService.newBackendStoryObject = {
      id: 'storyId_0',
      title: 'Story title',
      description: 'Story Description',
      notes: '<p>Notes/p>',
      story_contents: {
        initial_node_id: 'node_1',
        next_node_id: 'node_2',
        nodes: []
      },
      language_code: 'en',
      story_contents_schema_version: '1',
      version: '1',
      corresponding_topic_id: 'topic_id'
    };

    secondBackendStoryObject = {
      id: 'storyId_1',
      title: 'Story title  2',
      description: 'Story Description 2',
      notes: '<p>Notes 2/p>',
      story_contents: {
        initial_node_id: 'node_2',
        next_node_id: 'node_1',
        nodes: []
      },
      language_code: 'en',
      story_contents_schema_version: '1',
      version: '1',
      corresponding_topic_id: 'topic_id'
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: EditableStoryBackendApiService,
          useValue: fakeEditableStoryBackendApiService
        }
      ]
    }).compileComponents();

    alertsService = TestBed.get(AlertsService);
    storyEditorStateService = TestBed.get(StoryEditorStateService);
    storyObjectFactory = TestBed.get(StoryObjectFactory);
  });

  beforeEach(() => {
    testSubscriptions = new Subscription();
    testSubscriptions.add(storyEditorStateService.onStoryInitialized.subscribe(
      storyInitializedSpy));
    testSubscriptions.add(
      storyEditorStateService.onStoryReinitialized.subscribe(
        storyReinitializedSpy));
  });

  beforeEach(angular.mock.inject(function($injector) {
    storyUpdateService = $injector.get('StoryUpdateService');
  }));

  afterEach(() => {
    testSubscriptions.unsubscribe();
  });

  it('should request to load the story from the backend', () => {
    spyOn(
      fakeEditableStoryBackendApiService, 'fetchStoryAsync').and.callThrough();

    storyEditorStateService.loadStory('storyId_0');
    expect(
      fakeEditableStoryBackendApiService.fetchStoryAsync).toHaveBeenCalled();
  });

  it(
    'should fire an init event and set the topic name after loading the ' +
    'first story', fakeAsync(() => {
      storyEditorStateService.loadStory('storyId_0');
      tick(1000);
      expect(storyEditorStateService.getTopicName()).toEqual('Topic Name');
      expect(storyInitializedSpy).toHaveBeenCalled();
    }));

  it('should fire an update event after loading more stories', fakeAsync(() => {
    // Load initial story.
    storyEditorStateService.loadStory('storyId_0');
    tick(1000);

    // Load a second story.
    storyEditorStateService.loadStory('storyId_1');
    tick(1000);
    expect(storyReinitializedSpy).toHaveBeenCalled();
  }));

  it('should track whether it is currently loading the story', fakeAsync(() => {
    expect(storyEditorStateService.isLoadingStory()).toBe(false);

    storyEditorStateService.loadStory('storyId_0');
    expect(storyEditorStateService.isLoadingStory()).toBe(true);

    tick(1000);
    expect(storyEditorStateService.isLoadingStory()).toBe(false);
  }));

  it('should indicate a story is no longer loading after an error',
    fakeAsync(() => {
      expect(storyEditorStateService.isLoadingStory()).toBe(false);
      fakeEditableStoryBackendApiService.failure = 'Internal 500 error';

      storyEditorStateService.loadStory('storyId_0');
      expect(storyEditorStateService.isLoadingStory()).toBe(true);

      tick(1000);
      expect(storyEditorStateService.isLoadingStory()).toBe(false);
    }));

  it('should report that a story has loaded through loadStory()',
    fakeAsync(() => {
      expect(storyEditorStateService.hasLoadedStory()).toBe(false);

      storyEditorStateService.loadStory('storyId_0');
      expect(storyEditorStateService.hasLoadedStory()).toBe(false);

      tick(1000);
      expect(storyEditorStateService.hasLoadedStory()).toBe(true);
    }));

  it('should report that a story has loaded through setStory()', () => {
    expect(storyEditorStateService.hasLoadedStory()).toBe(false);

    var newStory = storyObjectFactory.createFromBackendDict(
      secondBackendStoryObject);
    storyEditorStateService.setStory(newStory);
    expect(storyEditorStateService.hasLoadedStory()).toBe(true);
  });

  it('should initially return an interstitial story', () => {
    var story = storyEditorStateService.getStory();
    expect(story.getId()).toEqual(null);
    expect(story.getTitle()).toEqual('Story title loading');
    expect(story.getDescription()).toEqual('Story description loading');
    expect(story.getNotes()).toEqual('Story notes loading');
    expect(story.getStoryContents()).toEqual(null);
  });

  it('should be able to set a new story with an in-place copy', () => {
    var previousStory = storyEditorStateService.getStory();
    var expectedStory = storyObjectFactory.createFromBackendDict(
      secondBackendStoryObject);
    expect(previousStory).not.toEqual(expectedStory);

    storyEditorStateService.setStory(expectedStory);

    var actualStory = storyEditorStateService.getStory();
    expect(actualStory).toEqual(expectedStory);

    expect(actualStory).toBe(previousStory);
    expect(actualStory).not.toBe(expectedStory);
  });

  it('should fail to save the story without first loading one', () => {
    expect(() => {
      storyEditorStateService.saveStory('Commit message');
    }).toThrowError('Cannot save a story before one is loaded.');
  });

  it('should not save the story if there are no pending changes',
    fakeAsync(() => {
      storyEditorStateService.loadStory('storyId_0');
      tick(1000);

      expect(storyEditorStateService.saveStory('Commit message')).toBe(false);
    }));

  it('should be able to save the story and pending changes', fakeAsync(() => {
    spyOn(
      fakeEditableStoryBackendApiService,
      'updateStoryAsync').and.callThrough();
    var successCallback = jasmine.createSpy('successCallback');

    storyEditorStateService.loadStory('storyId_0');
    storyUpdateService.setStoryTitle(
      storyEditorStateService.getStory(), 'New title');
    tick(1000);

    expect(
      storyEditorStateService.saveStory('Commit message', successCallback)
    ).toBe(true);
    tick(1000);

    var expectedId = 'storyId_0';
    var expectedVersion = '1';
    var expectedCommitMessage = 'Commit message';
    var updateStorySpy = (
      fakeEditableStoryBackendApiService.updateStoryAsync);
    expect(updateStorySpy).toHaveBeenCalledWith(
      expectedId, expectedVersion,
      expectedCommitMessage, jasmine.any(Object));
    expect(successCallback).toHaveBeenCalled();
  }));

  it('should be able to publish the story', fakeAsync(() => {
    spyOn(
      fakeEditableStoryBackendApiService,
      'changeStoryPublicationStatusAsync').and.callThrough();
    var successCallback = jasmine.createSpy('successCallback');

    storyEditorStateService.loadStory('topicId_1', 'storyId_0');
    tick(1000);

    expect(storyEditorStateService.isStoryPublished()).toBe(false);
    expect(
      storyEditorStateService.changeStoryPublicationStatus(
        true, successCallback)).toBe(true);
    tick(1000);

    var expectedId = 'storyId_0';
    var publishStorySpy = (
      fakeEditableStoryBackendApiService.changeStoryPublicationStatusAsync);
    expect(publishStorySpy).toHaveBeenCalledWith(
      expectedId, true);
    expect(storyEditorStateService.isStoryPublished()).toBe(true);
    expect(successCallback).toHaveBeenCalled();
  }));

  it('should warn user when story is not published', fakeAsync(() => {
    spyOn(
      fakeEditableStoryBackendApiService,
      'changeStoryPublicationStatusAsync').and.callThrough();
    spyOn(alertsService, 'addWarning');

    storyEditorStateService.loadStory('topicId_1', 'storyId_0');
    tick(1000);
    fakeEditableStoryBackendApiService.failure = 'Internal 500 error';

    expect(storyEditorStateService.isStoryPublished()).toBe(false);
    expect(
      storyEditorStateService.changeStoryPublicationStatus(
        true)).toBe(true);
    tick(1000);

    var expectedId = 'storyId_0';
    var publishStorySpy = (
      fakeEditableStoryBackendApiService.changeStoryPublicationStatusAsync);
    expect(publishStorySpy).toHaveBeenCalledWith(
      expectedId, true);
    expect(storyEditorStateService.isStoryPublished()).toBe(false);
    expect(alertsService.addWarning).toHaveBeenCalledWith(
      'There was an error when publishing/unpublishing the story.'
    );
  }));

  it('should warn user when user attepts to publish story before it loads',
    fakeAsync(() => {
      spyOn(alertsService, 'fatalWarning');
      storyEditorStateService._storyIsInitialized = false;

      storyEditorStateService.changeStoryPublicationStatus(true);

      expect(alertsService.fatalWarning)
        .toHaveBeenCalledWith('Cannot publish a story before one is loaded.');
    }));

  it('should fire an update event after saving the story', fakeAsync(() => {
    storyEditorStateService.loadStory('storyId_0');
    storyUpdateService.setStoryTitle(
      storyEditorStateService.getStory(), 'New title');
    tick(1000);

    storyEditorStateService.saveStory('Commit message');
    tick(1000);
    expect(storyReinitializedSpy).toHaveBeenCalled();
  }));

  it('should track whether it is currently saving the story', fakeAsync(() => {
    storyEditorStateService.loadStory('storyId_0');
    storyUpdateService.setStoryTitle(
      storyEditorStateService.getStory(), 'New title');
    tick(1000);

    expect(storyEditorStateService.isSavingStory()).toBe(false);
    storyEditorStateService.saveStory('Commit message');
    expect(storyEditorStateService.isSavingStory()).toBe(true);

    tick(1000);
    expect(storyEditorStateService.isSavingStory()).toBe(false);
  }));

  it('should warn user when story fails to save', fakeAsync(() => {
    spyOn(alertsService, 'addWarning');
    var successCallback = jasmine.createSpy('successCallback');
    var errorCallback = jasmine.createSpy('errorCallback');
    storyEditorStateService.loadStory('storyId_0');
    storyUpdateService.setStoryTitle(
      storyEditorStateService.getStory(), 'New title');
    tick(1000);
    fakeEditableStoryBackendApiService.failure = 'Internal 500 error';

    storyEditorStateService.saveStory(
      'Commit message', successCallback, errorCallback);
    tick(1000);

    expect(alertsService.addWarning)
      .toHaveBeenCalledWith('There was an error when saving the story.');
    expect(errorCallback)
      .toHaveBeenCalledWith('There was an error when saving the story.');
  }));

  it('should indicate a story is no longer saving after an error',
    fakeAsync(() => {
      storyEditorStateService.loadStory('storyId_0');
      storyUpdateService.setStoryTitle(
        storyEditorStateService.getStory(), 'New title');
      tick(1000);

      expect(storyEditorStateService.isSavingStory()).toBe(false);
      fakeEditableStoryBackendApiService.failure = 'Internal 500 error';

      storyEditorStateService.saveStory('Commit message');
      expect(storyEditorStateService.isSavingStory()).toBe(true);

      tick(1000);
      expect(storyEditorStateService.isSavingStory()).toBe(false);
    }));

  it('should update stories URL when user updates the storie\'s URL',
    fakeAsync(() => {
      var newStory = storyObjectFactory.createFromBackendDict(
        secondBackendStoryObject);
      storyEditorStateService.setStory(newStory);

      fakeEditableStoryBackendApiService.failure = '';
      storyEditorStateService._storyWithUrlFragmentExists = true;

      storyEditorStateService.updateExistenceOfStoryUrlFragment(
        'test_url', () =>{});
      tick(1000);

      expect(storyEditorStateService.getStoryWithUrlFragmentExists())
        .toBe(false);
    }));

  it('should warn user when user updates the storie\'s URL to an URL' +
  ' that already exits', fakeAsync(() => {
    spyOn(alertsService, 'addWarning');
    var newStory = storyObjectFactory.createFromBackendDict(
      secondBackendStoryObject);
    storyEditorStateService.setStory(newStory);

    fakeEditableStoryBackendApiService.failure = 'Story URL exists';
    storyEditorStateService._storyWithUrlFragmentExists = false;

    storyEditorStateService.updateExistenceOfStoryUrlFragment(
      'test_url', () =>{});
    tick(1000);

    expect(alertsService.addWarning).toHaveBeenCalledWith(
      'There was an error when checking if the story url fragment ' +
      'exists for another story.');
  }));

  it('should return classroom url fragment when called', fakeAsync(() => {
    storyEditorStateService.loadStory('storyId_0');
    tick(1000);

    expect(storyEditorStateService.getClassroomUrlFragment())
      .toBe('classroomUrlFragment');
  }));

  it('should return topic url fragment when called', fakeAsync(() => {
    storyEditorStateService.loadStory('storyId_0');
    tick(1000);

    expect(storyEditorStateService.getTopicUrlFragment())
      .toBe('topicUrlFragment');
  }));

  it('should return event emitters when called', () => {
    expect(storyEditorStateService.onStoryInitialized).toBe(
      storyEditorStateService._storyInitializedEventEmitter);
    expect(storyEditorStateService.onStoryReinitialized).toBe(
      storyEditorStateService._storyReinitializedEventEmitter);
    expect(storyEditorStateService.onViewStoryNodeEditor).toBe(
      storyEditorStateService._viewStoryNodeEditorEventEmitter);
    expect(storyEditorStateService.onRecalculateAvailableNodes).toBe(
      storyEditorStateService._recalculateAvailableNodesEventEmitter);
  });

  it('should set _expIdsChanged to true when setExpIdsChanged is ' +
  'called', () => {
    expect(storyEditorStateService.areAnyExpIdsChanged()).toBeFalse();

    storyEditorStateService.setExpIdsChanged();

    expect(storyEditorStateService.areAnyExpIdsChanged()).toBeTrue();
  });

  it('should set _expIdsChanged to false when resetExpIdsChanged is ' +
  'called', () => {
    storyEditorStateService.setExpIdsChanged();

    expect(storyEditorStateService.areAnyExpIdsChanged()).toBeTrue();

    storyEditorStateService.resetExpIdsChanged();

    expect(storyEditorStateService.areAnyExpIdsChanged()).toBeFalse();
  });

  it('should return skill summaries when called', fakeAsync(() => {
    storyEditorStateService.loadStory('storyId_0');
    tick(1000);

    expect(storyEditorStateService.getSkillSummaries()).toEqual([{
      id: 'Skill 1',
      description: 'Skill Description'
    }]);
  }));
});
