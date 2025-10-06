import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangeDetectorRef, ElementRef } from '@angular/core';
import { ConversationComponent } from './conversation.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { selectCurrentMessage } from '../../store/selectors/selector';
import { selectUserInfo } from '@servicing-core-sdk/global-store';
import { ChatConversation, FeedbackType } from '../../shared/types/types';
import { PRODUCT_TYPE, PROMPT_SOURCE_TYPE, PROMPT_TYPE } from '../../types/types';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { AiAssistantService } from '../../shared/services/ai-assistant.service';
import { AppsCommonService } from '@servicing-core-sdk/apps-common';
import { HttpClientTestingModule, HttpErrorResponse } from '@servicing-core-sdk/http';
import { ConfigModule } from '@servicing-core-sdk/configurations';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { AiAssistantBaseService, GetConversationResponse, StartConversationResponse } from '@servicing-apps-sdk/ai-assistant';
import { CHANGE_TRIP_DETAILS_SUGGESTION, HTTP_ERROR_MESSAGE, STREAM_RESPONSE_TYPE } from '../../shared/constants/constants';
import { DialogService } from "@servicing-core-components/dialog";
import { PROMPT_RESPONSE_FEEDBACK } from "../../shared/constants/constants";

window['__webpack_public_path__'] = '/ade-ai-assistant/';
jest.mock('@servicing-infra/utils/common', () => ({
  assetUrl: (fileName: string) => `mocked-assets/${fileName}`,
}));

describe('ConversationComponent', () => {
  let component: ConversationComponent;
  let aiAssistantService: AiAssistantService;
  let appsCommonService: AppsCommonService;
  let fixture: ComponentFixture<ConversationComponent>;
  let store: MockStore;
  let startConversationResponse$: Observable<StartConversationResponse> | null = null;

  const profile = {
    roles: ['tier1', 'tier2'],
    preferred_username: 'userfirstname',
    given_name: 'firstname',
    middle_name: '',
    family_name: 'lastname',
    email: 'first.lastname@domain.com',
    creation_date: '10-10-2022',
    updation_date: '10-11-2022',
    nameidentifier: 'test',
    own: 'test',
    scope: 'test',
    sown: 'test',
    sub: 'test',
    id: 'test',
    user_display_name: 'Test Agent',
    client_association: ['AllExceptChase', 'Chase'],
    selected_role: 'tier1',
    userId: 't12345',
  };

  const mockChatHistory: ChatConversation[] = [];
  const mockCurrentMessage: ChatConversation = {
    id: 'abc123',
    promptInput: 'Tell me something cool',
    promptType: PROMPT_TYPE.GUIDED,
    promptProductType: PRODUCT_TYPE.HOTEL,
    promptResponse: '',
    source: PROMPT_SOURCE_TYPE.HOME,
    isFormSubmitted: false,
  };

  beforeEach(async () => {

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ConfigModule,
        NoopAnimationsModule,
        CommonModule
      ],
      declarations: [ConversationComponent],
      providers: [
        AiAssistantService, AiAssistantBaseService,
        provideMockStore({
          selectors: [
            { selector: selectUserInfo, value: profile },
            { selector: selectCurrentMessage, value: mockCurrentMessage },
          ]
        }),
        { provide: ChangeDetectorRef, useValue: { detectChanges: () => { } } },
        {
          provide: ChangeDetectorRef,
          useValue: { detectChanges: jest.fn() }
        }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(ConversationComponent);
    component = fixture.componentInstance;
    aiAssistantService = TestBed.inject(AiAssistantService);
    appsCommonService = TestBed.inject(AppsCommonService);

    jest.spyOn(store, 'dispatch');
    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });
    jest.spyOn(appsCommonService.client.logger, 'logException').mockImplementation(() => { });

    store = TestBed.inject(MockStore);

    component.chatContentRef = {
      nativeElement: {
        scrollTop: 0,
        scrollHeight: 1200,
        clientHeight: 600
      }
    } as ElementRef;

    jest.spyOn((component as any).aiAssistantService, 'getFreeformConversationResponse').mockImplementation(() => {
      return new Observable<GetConversationResponse>((observer) => {
        observer.next({
          type: 'demo',
          data: {
            message: 'mock',
            endOfStreamFlag: false,
            questions: ''
          }
        });
      });
    });

    jest.spyOn((component as any).aiAssistantService, 'getActivityGuidedConversationResponse').mockImplementation(() => {
      return new Observable<GetConversationResponse>((observer) => {
        observer.next({
          type: 'demo',
          data: {
            message: 'mock',
            endOfStreamFlag: false,
            questions: ''
          }
        });
      });
    });

    jest.spyOn((component as any).aiAssistantService, 'getStartConversationResponse')
      .mockImplementation(() => {
        return of({
          conversationId: '123',
          metadata: { timestamp: Date.now() },
        } as unknown as StartConversationResponse);
      });

    jest.spyOn((component as any).aiAssistantService, 'updateFeedBack')
        .mockImplementation(() => {
          return of(true);
        });


    jest.spyOn(appsCommonService.client.logger, 'logTrace');
    jest.spyOn(appsCommonService.client.logger, 'logException');

    (component as any).snackBarService = {
      show: jest.fn()
    };
    (navigator as any).clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set agent initials on init', () => {
    component.setUserInitials(profile);
    component.ngOnInit();
    expect(component.agentInitials).toBe('TA');
  });

  it('should handle guided prompt and set hotel form flag', () => {
    component.handleInputPrompt(mockCurrentMessage);
    expect(component.enableHotelForm).toBe(true);
    expect(component.enableActivityForm).toBe(false);
  });

  it('should handle guided prompt and set activity form flag', () => {
    const mockActivityForm: ChatConversation = {
      id: 'abc123',
      promptInput: 'Tell me something cool',
      promptType: PROMPT_TYPE.GUIDED,
      promptProductType: PRODUCT_TYPE.ACTIVITY,
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.HOME,
      isFormSubmitted: false
    };

    component.handleInputPrompt(mockActivityForm);
    expect(component.enableHotelForm).toBe(false);
    expect(component.enableActivityForm).toBe(true);
  });

  it('should scroll to bottom and update flags', () => {
    component.scrollToBottom();
    expect(component.isScrolledToBottom).toBe(true);
  });

  it('should update scroll flags based on position', () => {
    component.chatContentRef.nativeElement.scrollTop = 300;
    component.chatContentRef.nativeElement.scrollHeight = 1000;
    component.chatContentRef.nativeElement.clientHeight = 500;

    component.updateScrollFlags();
    expect(component.isScrolledToBottom).toBe(false);
  });

  it('should update chat response after aiAPiCall delay', fakeAsync(() => {
    component.processPrompt(mockCurrentMessage);
    tick(3000);
    expect(component.isLoading).toBe(false);
  }));

  it('should update chat response after hotel aiAPiCall delay', fakeAsync(() => {
    let mockCurrentMessageGuided = {
      id: 'abc123',
      conversationId: 'mockConvId',
      promptInput: 'Tell me something cool',
      promptType: PROMPT_TYPE.GUIDED,
      promptProductType: PRODUCT_TYPE.HOTEL,
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.GUIDED_FORM,
      isFormSubmitted: false
    };

    component.processPrompt(mockCurrentMessageGuided);
    tick(3000);
    expect(component.isLoading).toBe(false);
  }));

  it('should update chat response after activity aiAPiCall delay', fakeAsync(() => {
    let mockCurrentMessageGuided = {
      id: 'abc123',
      conversationId: 'mockConvId',
      promptInput: 'Tell me something cool',
      promptType: PROMPT_TYPE.GUIDED,
      promptProductType: PRODUCT_TYPE.ACTIVITY,
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.GUIDED_FORM,
      isFormSubmitted: false
    };

    component.processPrompt(mockCurrentMessageGuided);
    tick(3000);
    expect(component.isLoading).toBe(false);
  }));

  it('should not update chat response updateResponse after aiAPiCall delay', fakeAsync(() => {
    const mockEmptyIdData = { ...mockCurrentMessage };
    mockEmptyIdData.id = '';
    component.chatConversations.push(mockCurrentMessage);
    component.processPrompt(mockEmptyIdData);
    tick(3000);
    expect(component.isLoading).toBe(false);
  }));

  it('should submit event from guided form after submit click', fakeAsync(() => {
    const handleInputPromptSpy = jest.spyOn(component, 'handleInputPrompt');
    component.handleGuidedFormSubmitEvent(mockCurrentMessage);
    tick(3000);
    expect(handleInputPromptSpy).toHaveBeenCalled();
  }));

  it('should call updateScrollFlags and detectChanges in ngAfterViewInit', () => {
    jest.spyOn(component, 'updateScrollFlags').mockImplementation(jest.fn());
    component.ngAfterViewInit();
    expect(component.updateScrollFlags).toHaveBeenCalled();
  });

  it('should call internal methods correctly on ngOnInit', () => {
    const selectUserInfo$ = new BehaviorSubject(null);
    const selectCurrentMessage$ = new BehaviorSubject('mockdata');

    jest.spyOn(store, 'select').mockImplementation((selector: any) => {
      switch (selector) {
        case selectUserInfo:
          return selectUserInfo$;
        case selectCurrentMessage:
          return selectCurrentMessage$;
        default:
          return of(null);
      }
    });

    store.overrideSelector(selectUserInfo, null);
    store.overrideSelector(selectCurrentMessage, null);

    // Spy on internal methods
    const userSpy = jest.spyOn(component, 'setUserInitials');
    const inputSpy = jest.spyOn(component, 'handleInputPrompt');

    // Trigger lifecycle
    component.ngOnInit();
    fixture.detectChanges(); // flush subscriptions

    expect(userSpy).toHaveBeenCalled();
    expect(inputSpy).toHaveBeenCalled();

    selectUserInfo$.next(null);
    selectCurrentMessage$.next('mockdata');

    expect(userSpy).toHaveBeenCalled();
    expect(inputSpy).toHaveBeenCalled();
  });

  it('should log exception if free_form api failure', () => {
    const mockStartConversationResponse: StartConversationResponse = {
      conversationId: 'abc123',
      isActive: false
    };

    jest.spyOn(aiAssistantService, 'getStartConversationResponse')
      .mockReturnValue(of(mockStartConversationResponse));

    const spy = jest.spyOn(aiAssistantService, 'getFreeformConversationResponse').mockImplementation(() => {
      return throwError('');
    });

    let mockFailure = { ...mockCurrentMessage, promptType: PROMPT_TYPE.GUIDED, source: PROMPT_SOURCE_TYPE.GUIDED_FORM };
    component.processPrompt(mockFailure);
    expect(component.isLoading).toBeFalsy();
  });

  it('should log exception if hotel guided api failure', () => {
    const mockStartConversationResponse: StartConversationResponse = {
      conversationId: 'abc123',
      isActive: false
    };

    jest.spyOn(aiAssistantService, 'getStartConversationResponse')
      .mockReturnValue(of(mockStartConversationResponse));

    const spy = jest.spyOn(aiAssistantService, 'getHotelGuidedConversationResponse').mockImplementation(() => {
      return throwError('');
    });

    let mockFailure = { ...mockCurrentMessage, promptType: PROMPT_TYPE.GUIDED, source: PROMPT_SOURCE_TYPE.GUIDED_FORM };
    component.processPrompt(mockFailure);
    expect(component.isLoading).toBeFalsy();
  });

  it('should log exception if activity guided api failure', () => {
    const mockStartConversationResponse: StartConversationResponse = {
      conversationId: 'abc123',
      isActive: false
    };

    jest.spyOn(aiAssistantService, 'getStartConversationResponse')
      .mockReturnValue(of(mockStartConversationResponse));

    const spy = jest.spyOn(aiAssistantService, 'getActivityGuidedConversationResponse').mockImplementation(() => {
      return throwError('');
    });

    let mockFailure = { ...mockCurrentMessage, promptType: PROMPT_TYPE.GUIDED, source: PROMPT_SOURCE_TYPE.GUIDED_FORM, promptProductType: PRODUCT_TYPE.ACTIVITY };
    component.processPrompt(mockFailure);
    expect(component.isLoading).toBeFalsy();
  });

  it('should log exception if freeform api failure', () => {
    const mockStartConversationResponse: StartConversationResponse = {
      conversationId: 'abc123',
      isActive: false
    };

    const mockError = new Error('Test error');

    jest.spyOn(aiAssistantService, 'getFreeformConversationResponse')
      .mockReturnValue(throwError(() => mockError));

    component.getFreeformResponse(mockCurrentMessage, mockStartConversationResponse).subscribe({
      next: () => { },
      error: (err) => {
        expect(component.isLoading).toBe(false);
        expect(err).toBe(mockError);
      }
    });
  });

  it('should handle error from getStartConversationResponse()', (done) => {
    let mockCurrentMessageGuided = {
      id: 'abc123',
      conversationId: 'mockConvId',
      promptInput: 'Tell me something cool',
      promptType: PROMPT_TYPE.GUIDED,
      promptProductType: PRODUCT_TYPE.HOTEL,
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.GUIDED_FORM,
      isFormSubmitted: false
    };
    const mockError = {message:"test error", status:500};
    jest.spyOn(aiAssistantService, 'getStartConversationResponse')
      .mockReturnValue(throwError(() => mockError));

    component.processPrompt(mockCurrentMessageGuided);
    component.startConversationResponse$?.subscribe({
      error: (err) => {
        expect(component.isLoading).toBe(false);
        expect(err).toEqual(mockError);
        done();
      }
    });
  });

  it('should set response and stop loading on getStartConversationResponse success', () => {
    const mockStartConversationResponse: StartConversationResponse = {
      conversationId: '1234',
      isActive: false
    };

    const chatConversation: ChatConversation = {
      id: 'abc123',
      promptInput: 'Tell me something cool',
      promptType: PROMPT_TYPE.FREEFORM,
      promptProductType: PRODUCT_TYPE.HOTEL,
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.CONVERSATION,
      isFormSubmitted: false
    };

    const mockGetConversationResponse = {
      type: 'demo',
      data: {
        message: 'mock',
        endOfStreamFlag: false,
        questions: ''
      }
    };

    const spy = jest.spyOn(aiAssistantService, 'getStartConversationResponse')
      .mockReturnValue(of(mockStartConversationResponse));

    const spy2 = jest.spyOn(aiAssistantService, 'getFreeformConversationResponse')
      .mockReturnValue(of(mockGetConversationResponse));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });

    component.processPrompt(chatConversation);

    expect(spy).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });


  it('should handle error when starting conversation with null response', async () => {
    // Arrange
    const errorMessage = 'Error starting conversation';
    component.startConversationResponse$ = null;

    // Act
    await component.ngOnInit();

    // Assert
    expect(component.isLoading).toBe(false);
  });


  it('should set recommended questions for freeform flow', () => {
    const mockStartConversationResponse: StartConversationResponse = {
      conversationId: 'abc123',
      isActive: false
    };

    const chatConversation: ChatConversation = {
      id: 'mock123',
      promptInput: 'Tell me something cool',
      promptType: PROMPT_TYPE.FREEFORM,
      promptProductType: PRODUCT_TYPE.HOTEL,
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.CONVERSATION,
      isFormSubmitted: false
    };

    const mockGetConversationResponse = {
      type: STREAM_RESPONSE_TYPE.RecommendedQuestions,
      data: {
        message: 'mock',
        endOfStreamFlag: false,
        questions: 'test question\nmock question'
      }
    };

    const spy = jest.spyOn(aiAssistantService, 'getStartConversationResponse')
      .mockReturnValue(of(mockStartConversationResponse));

    const spy2 = jest.spyOn(aiAssistantService, 'getFreeformConversationResponse')
      .mockReturnValue(of(mockGetConversationResponse));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });

    component.chatConversations.push({
      id: 'mock123',
      promptInput: 'test',
      promptType: PROMPT_TYPE.FREEFORM,
      promptProductType: '',
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.CONVERSATION,
      isFormSubmitted: false
    });

    component.processPrompt(chatConversation);

    expect(spy).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('should set recommended questions for guided flow', () => {
    const mockStartConversationResponse: StartConversationResponse = {
      conversationId: 'abc123',
      isActive: false
    };

    const chatConversation: ChatConversation = {
      id: 'mock123',
      promptInput: 'Tell me something cool',
      promptType: PROMPT_TYPE.GUIDED,
      promptProductType: PRODUCT_TYPE.HOTEL,
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.GUIDED_FORM,
      isFormSubmitted: false
    };

    const mockGetConversationResponse = {
      type: STREAM_RESPONSE_TYPE.RecommendedQuestions,
      data: {
        message: 'mock',
        endOfStreamFlag: false,
        questions: 'test question\nmock question'
      }
    };

    const spy = jest.spyOn(aiAssistantService, 'getStartConversationResponse')
      .mockReturnValue(of(mockStartConversationResponse));

    const spy2 = jest.spyOn(aiAssistantService, 'getHotelGuidedConversationResponse')
      .mockReturnValue(of(mockGetConversationResponse));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });

    component.chatConversations.push({
      id: 'mock123',
      promptInput: 'test',
      promptType: PROMPT_TYPE.GUIDED,
      promptProductType: '',
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.GUIDED_FORM,
      isFormSubmitted: false
    });

    component.processPrompt(chatConversation);

    expect(spy).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('should handle NULL startResponse from getStartConversationResponse()', () => {
    const chatConversation: ChatConversation = {
      id: 'abc123',
      promptInput: 'Tell me something cool',
      promptType: PROMPT_TYPE.FREEFORM,
      promptProductType: PRODUCT_TYPE.HOTEL,
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.CONVERSATION,
      isFormSubmitted: false
    };

    const mockGetConversationResponse = {
      type: 'demo',
      data: {
        message: 'mock',
        endOfStreamFlag: false,
        questions: ''
      }
    };

    const mockStartConversationResponse: any = null;
    const spy = jest.spyOn(aiAssistantService, 'getStartConversationResponse').mockReturnValue(of(mockStartConversationResponse));

    const spy2 = jest.spyOn(aiAssistantService, 'getFreeformConversationResponse')
      .mockReturnValue(of(mockGetConversationResponse));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });

    component.processPrompt(chatConversation);
    expect(component.isLoading).toBe(false);
  });

  it('should handle NULL getFreeformConversationResponse from getStartConversationResponse()', () => {
    const chatConversation: ChatConversation = {
      id: 'abc123',
      promptInput: 'Tell me something cool',
      promptType: PROMPT_TYPE.FREEFORM,
      promptProductType: PRODUCT_TYPE.HOTEL,
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.CONVERSATION,
      isFormSubmitted: false
    };

    const mockGetConversationResponse = {
      type: 'demo',
      data: {
        message: 'mock',
        endOfStreamFlag: false,
        questions: ''
      }
    };

    const mockNullFreeformConversationResponse: any = null;

    const mockStartConversationResponse: StartConversationResponse = {
      conversationId: 'abc123',
      isActive: false
    };

    const spy = jest.spyOn(aiAssistantService, 'getStartConversationResponse')
      .mockReturnValue(of(mockStartConversationResponse));

    const spy2 = jest.spyOn(aiAssistantService, 'getFreeformConversationResponse')
      .mockReturnValue(of(mockNullFreeformConversationResponse));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });

    component.processPrompt(chatConversation);
    expect(component.isLoading).toBe(false);
  });


  it('should handle non matching conversation id to not update the chat', () => {
    const chatConversation: ChatConversation = {
      id: 'abc123',
      promptInput: 'Tell me something cool',
      promptType: PROMPT_TYPE.FREEFORM,
      promptProductType: PRODUCT_TYPE.HOTEL,
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.CONVERSATION,
      isFormSubmitted: false
    };

    const mockGetConversationResponse = {
      type: 'demo',
      data: {
        message: 'mock',
        endOfStreamFlag: false,
        questions: ''
      }
    };


    const mockNullFreeformConversationResponse = {
      type: 'demo',
      data: {
        message: 'mock',
        endOfStreamFlag: false,
        questions: ''
      }
    };

    const mockStartConversationResponse: StartConversationResponse = {
      conversationId: 'abc123',
      isActive: false
    };

    const spy = jest.spyOn(aiAssistantService, 'getStartConversationResponse')
      .mockReturnValue(of(mockStartConversationResponse));

    const spy2 = jest.spyOn(aiAssistantService, 'getFreeformConversationResponse')
      .mockReturnValue(of(mockNullFreeformConversationResponse));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });
    component.chatConversations.push({
      id: 'mock123',
      promptInput: 'test',
      promptType: PROMPT_TYPE.FREEFORM,
      promptProductType: '',
      promptResponse: '',
      source: PROMPT_SOURCE_TYPE.CONVERSATION,
      isFormSubmitted: false
    });

    component.processPrompt(chatConversation);
    expect(component.isLoading).toBe(false);
  });

  it('should update trip details text and enable hotel form on changeTripDetailsClick', () => {
    component.currentChatConversation = mockCurrentMessage;
    component.onChangeTripDetailsClick();
    expect(component.hotelGuidedFlowChangeTripDetailsText).toBe(CHANGE_TRIP_DETAILS_SUGGESTION);
    expect(component.enableHotelForm).toBe(true)
  });

  it('should update trip details text and enable activiy form on changeTripDetailsClick', () => {
    component.currentChatConversation = mockCurrentMessage;
    component.currentChatConversation.promptProductType = PRODUCT_TYPE.ACTIVITY
    component.onChangeTripDetailsClick();
    expect(component.activityGuidedFlowChangeTripDetailsText).toBe(CHANGE_TRIP_DETAILS_SUGGESTION);
    expect(component.enableActivityForm).toBe(true)
  });

  it('should copy selected suggestion to prompt input on suggestion click', () => {
    const suggestion = 'Visit Tokyo in spring';
    component.onSuggestionClickToCopy(suggestion);
  });

  it('setFeedback should update feedback on chat', () => {
    component.chatConversations.push(mockCurrentMessage);
    component.setFeedback('abc123', 'thumbsUp' as any);
    expect(component.chatConversations[0].feedbackType).toBe('thumbsUp');
  });

  it('handleThumbsUpFeedback should set thumbsUp if not already set', () => {
    component.thumbsUpKey = PROMPT_RESPONSE_FEEDBACK.THUMBS_UP_KEY as FeedbackType;
    component.chatConversations.push(mockCurrentMessage);
    component.handleThumbsUpFeedback(component.chatConversations[0]);
    expect(component.chatConversations[0].feedbackType).toBe(component.thumbsUpKey);
  });

  it('handleThumbsUpFeedback should error out if feedback api returns error', () => {
    component.thumbsUpKey = PROMPT_RESPONSE_FEEDBACK.THUMBS_UP_KEY as FeedbackType;
    component.chatConversations.push(mockCurrentMessage);
    const mockError = {message: 'Test error',status:500} ;//new Error('Test error');
    jest.spyOn(aiAssistantService, 'updateFeedBack').mockReturnValue(throwError(() => mockError));
    component.handleThumbsUpFeedback(component.chatConversations[0]);
    expect(component.chatConversations[0].feedbackType).toBe(component.thumbsUpKey);
  });

  it('loadThumbsDownFeedback should set thumbsDown and show snackbar when dialog returns payload', () => {
    component.thumbsDownKey = PROMPT_RESPONSE_FEEDBACK.THUMBS_DOWN_KEY as FeedbackType;
    component.chatConversations.push(mockCurrentMessage);
    const dialog = TestBed.inject(DialogService);

    const mockDialogRef = {
      afterClosed: jest.fn().mockReturnValue(of({ submitted: true })),
      close: jest.fn(),
    } as any;

    jest.spyOn(dialog, 'openWithComponentRef').mockReturnValue(mockDialogRef);

    component.loadThumbsDownFeedback(component.chatConversations[0]);

    expect(component.chatConversations[0].feedbackType).toBe(component.thumbsDownKey);
    expect((component as any).snackBarService.show).toHaveBeenCalled();
  });

  it('loadThumbsDownFeedback should not take any action when dialog returns falsy', () => {
    component.thumbsDownKey = PROMPT_RESPONSE_FEEDBACK.THUMBS_DOWN_KEY as FeedbackType;
    component.chatConversations.push(mockCurrentMessage);
    const dialog = TestBed.inject(DialogService);

    const mockDialogRef = {
      afterClosed: jest.fn().mockReturnValue(of(undefined)),
      close: jest.fn(),
    } as any;

    jest.spyOn(dialog, 'openWithComponentRef').mockReturnValue(mockDialogRef);

    component.loadThumbsDownFeedback(component.chatConversations[0]);

    expect(component.chatConversations[0].feedbackType).not.toBe(component.thumbsDownKey);
    expect((component as any).snackBarService.show).not.toHaveBeenCalled();
  });

  it('loadThumbsDownFeedback should return early when feedback is already thumbsDown', () => {
    component.thumbsDownKey = PROMPT_RESPONSE_FEEDBACK.THUMBS_DOWN_KEY as FeedbackType;
    component.chatConversations = [
      {
        ...mockCurrentMessage,
        feedbackType: 'thumbsDown' as any,
      },
    ];
    const dialog = TestBed.inject(DialogService);
    const openSpy = jest.spyOn(dialog, 'openWithComponentRef');
    component.loadThumbsDownFeedback(component.chatConversations[0]);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('setFeedback should update chat', () => {
    component.thumbsUpKey = PROMPT_RESPONSE_FEEDBACK.THUMBS_UP_KEY as FeedbackType;
    component.chatConversations.push(mockCurrentMessage);
    component.setFeedback('abc123', component.thumbsUpKey);
    expect(component.chatConversations[0].feedbackType).toBe(component.thumbsUpKey);
  });

  it('handleThumbsUpFeedback should set thumbsUp', () => {
    component.thumbsUpKey = PROMPT_RESPONSE_FEEDBACK.THUMBS_UP_KEY as FeedbackType;
    component.chatConversations.push(mockCurrentMessage);
    component.handleThumbsUpFeedback(component.chatConversations[0]);
    expect(component.chatConversations[0].feedbackType).toBe(component.thumbsUpKey);

    component.handleThumbsUpFeedback(component.chatConversations[0]);
    expect(component.chatConversations[0].feedbackType).toBe(component.thumbsUpKey);
  });

  it('copyPromptResponse should copy markdown and show snackbar', async () => {
    component.chatConversations.push(mockCurrentMessage);
    await component.copyPromptResponse('**markdown**');
    expect((navigator as any).clipboard.writeText).toHaveBeenCalledWith('**markdown**');
    expect((component as any).snackBarService.show).toHaveBeenCalled();
  });

  it('copyPromptResponse should return early when markdownResponse is falsy', async () => {
    await component.copyPromptResponse(undefined);
    expect((navigator as any).clipboard.writeText).not.toHaveBeenCalled();
    expect((component as any).snackBarService.show).not.toHaveBeenCalled();
  });

  it('should set generic error message when error status is 400', async () => {
    const error = new HttpErrorResponse({
      status: 400,
      statusText: 'Generic error',
    })
    component.setErrorMessage(error);
    expect(component.errorMessage).toEqual(HTTP_ERROR_MESSAGE.GENERIC);
  });

  it('should set service down error message when error status is 404,500,504', async () => {
    let notFoundError = new HttpErrorResponse({
      status: 404,
      statusText: 'Not found error',
    })
    component.setErrorMessage(notFoundError);
    expect(component.errorMessage).toEqual(HTTP_ERROR_MESSAGE.SERVICE_DOWN);

    const internalServerError = new HttpErrorResponse({
      status: 500,
      statusText: 'Internal server error',
    })
    component.setErrorMessage(internalServerError);
    expect(component.errorMessage).toEqual(HTTP_ERROR_MESSAGE.SERVICE_DOWN);

    const timeoutError = new HttpErrorResponse({
      status: 504,
      statusText: 'Timeout error',
    })
    component.setErrorMessage(timeoutError);
    expect(component.errorMessage).toEqual(HTTP_ERROR_MESSAGE.SERVICE_DOWN);
  });

  // Additional test cases for uncovered code

  it('should hide guided forms and reset text', () => {
    component.enableHotelForm = true;
    component.enableActivityForm = true;
    component.hotelGuidedFlowChangeTripDetailsText = 'Change trip details';

    component.hideGuidedForms();

    expect(component.enableHotelForm).toBe(false);
    expect(component.enableActivityForm).toBe(false);
    expect(component.hotelGuidedFlowChangeTripDetailsText).toBe('');
  });

  it('should read response and update chat conversation with message', () => {
    const mockConversationResponse = {
      type: STREAM_RESPONSE_TYPE.RecommendedQuestions,
      data: {
        message: 'This is a test message',
        questions: 'Question 1\nQuestion 2'
      },
      conversationId: 'test-conv-id',
      messageId: 'test-msg-id'
    };

    const mockChatConversation = {
      id: 'test-id',
      promptInput: 'Test prompt',
      promptResponse: 'Existing response',
      source: PROMPT_SOURCE_TYPE.CONVERSATION,
      questions: '',
      conversationId: '',
      messageId: ''
    };

    component.chatConversations = [mockChatConversation];

    component.readResponse(mockConversationResponse, mockChatConversation);

    expect(component.chatConversations[0].promptResponse).toBe('Existing responseThis is a test message');
    expect(component.chatConversations[0].conversationId).toBe('test-conv-id');
    expect(component.chatConversations[0].messageId).toBe('test-msg-id');
    expect(component.chatConversations[0].questions).toBe('Question 1\nQuestion 2');
  });

  it('should read response and handle recommended questions', () => {
    const mockConversationResponse = {
      type: STREAM_RESPONSE_TYPE.RecommendedQuestions,
      data: {
        message: '',
        questions: 'Question 1\nQuestion 2\nQuestion 3'
      }
    };

    const mockChatConversation = {
      id: 'test-id',
      promptInput: 'Test prompt',
      source: PROMPT_SOURCE_TYPE.CONVERSATION,
      questions: ''
    };

    component.chatConversations = [mockChatConversation];

    component.readResponse(mockConversationResponse, mockChatConversation);

    expect(component.suggestions).toEqual([
      { text: 'Question 1' },
      { text: 'Question 2' },
      { text: 'Question 3' }
    ]);
  });

  it('should read response and add guided prompt for guided form', () => {
    const mockConversationResponse = {
      type: 'demo',
      data: {
        message: 'Response message',
        questions: ''
      }
    };

    const mockChatConversation = {
      id: 'test-id',
      promptInput: 'Test prompt',
      source: PROMPT_SOURCE_TYPE.GUIDED_FORM
    };

    component.chatConversations = [mockChatConversation];
    component.suggestions = [];

    component.readResponse(mockConversationResponse, mockChatConversation);

    expect(component.suggestions).toEqual([
      {
        text: 'Change trip details and search again?',
        type: PROMPT_TYPE.GUIDED
      }
    ]);
  });

  it('should move guided prompt to the end of suggestions', () => {
    const mockConversationResponse = {
      type: STREAM_RESPONSE_TYPE.RecommendedQuestions,
      data: {
        message: '',
        questions: 'Regular question'
      }
    };

    const mockChatConversation = {
      id: 'test-id',
      promptInput: 'Test prompt',
      source: PROMPT_SOURCE_TYPE.GUIDED_FORM
    };

    component.chatConversations = [mockChatConversation];
    component.suggestions = [
      { text: 'Change trip details and search again?', type: PROMPT_TYPE.GUIDED },
      { text: 'Regular question' }
    ];

    component.readResponse(mockConversationResponse, mockChatConversation);

    expect(component.suggestions).toEqual([
      { text: 'Regular question' },
      { text: 'Change trip details and search again?', type: PROMPT_TYPE.GUIDED }
    ]);
  });

  it('should create hotel guided form request correctly', () => {
    const mockChatConversation = {
      hotelFormData: {
        travelersCount: { adults: 2, children: 1 },
        whereTo: 'Tokyo',
        tripMonth: 'March',
        starRating: '4 star',
        tripType: 'Business',
        hotelLoyaltyProgram: 'Hilton Honors',
        additionalPreferences: 'Near airport'
      }
    };

    const conversationId = 'test-conv-id';
    const request = (component as any).getHotelGuidedformRequest(mockChatConversation, conversationId);

    expect(request).toEqual({
      conversationId: 'test-conv-id',
      travellers: {
        adult: 2,
        child: 1
      },
      location: 'Tokyo',
      tripMonth: ['March'],
      rating: [4],
      tripType: ['Business'],
      hotelLoyaltyProgram: ['Hilton Honors'],
      additionalPreference: 'Near airport',
      startTimeStamp: expect.any(String)
    });
  });

  it('should create hotel guided form request with default values when form data is missing', () => {
    const mockChatConversation = {};
    const conversationId = 'test-conv-id';
    const request = (component as any).getHotelGuidedformRequest(mockChatConversation, conversationId);

    expect(request).toEqual({
      conversationId: 'test-conv-id',
      travellers: {
        adult: 0,
        child: 0
      },
      location: '',
      tripMonth: [''],
      rating: [0],
      tripType: [''],
      hotelLoyaltyProgram: [''],
      additionalPreference: '',
      startTimeStamp: expect.any(String)
    });
  });

  it('should create activity guided form request correctly', () => {
    const mockChatConversation = {
      activityFormData: {
        travelersCount: { adults: 3, children: 2 },
        tripDestination: 'Paris',
        tripMonth: 'June',
        tripActivities: ['Museum', 'Food Tour'],
        tripAdditionals: 'Romantic getaway'
      }
    };

    const conversationId = 'test-conv-id';
    const request = (component as any).getActivityGuidedformRequest(mockChatConversation, conversationId);

    expect(request).toEqual({
      conversationId: 'test-conv-id',
      travellers: {
        adult: 3,
        child: 2
      },
      location: 'Paris',
      tripMonth: ['June'],
      activityType: ['Museum', 'Food Tour'],
      additionalPreference: 'Romantic getaway',
      startTimeStamp: expect.any(String)
    });
  });

  it('should create activity guided form request with default values when form data is missing', () => {
    const mockChatConversation = {};
    const conversationId = 'test-conv-id';
    const request = (component as any).getActivityGuidedformRequest(mockChatConversation, conversationId);

    expect(request).toEqual({
      conversationId: 'test-conv-id',
      travellers: {
        adult: 0,
        child: 0
      },
      location: '',
      tripMonth: [''],
      activityType: [],
      additionalPreference: '',
      startTimeStamp: expect.any(String)
    });
  });

  it('should create freeform request correctly', () => {
    const mockChatConversation = {
      promptInput: 'Tell me about Tokyo hotels'
    };

    const conversationId = 'test-conv-id';
    const request = (component as any).getFreeformRequest(mockChatConversation, conversationId);

    expect(request).toEqual({
      message: 'Tell me about Tokyo hotels',
      conversationId: 'test-conv-id'
    });
  });

  it('should handle successful hotel guided response', fakeAsync(() => {
    const mockStartResponse = { conversationId: 'test-conv-id' };
    const mockResponse = {
      type: 'demo',
      data: {
        message: 'Hotel response',
        questions: ''
      }
    };

    jest.spyOn(aiAssistantService, 'getHotelGuidedConversationResponse')
      .mockReturnValue(of(mockResponse));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });

    component.getHotelGuidedformResponse(mockCurrentMessage, mockStartResponse).subscribe({
      next: (response) => {
        expect(response).toEqual(mockResponse);
      }
    });

    expect(aiAssistantService.getHotelGuidedConversationResponse).toHaveBeenCalled();
  }));

  it('should handle successful activity guided response', fakeAsync(() => {
    const mockStartResponse = { conversationId: 'test-conv-id' };
    const mockResponse = {
      type: 'demo',
      data: {
        message: 'Activity response',
        questions: ''
      }
    };

    jest.spyOn(aiAssistantService, 'getActivityGuidedConversationResponse')
      .mockReturnValue(of(mockResponse));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });

    component.getActivityGuidedformResponse(mockCurrentMessage, mockStartResponse).subscribe({
      next: (response) => {
        expect(response).toEqual(mockResponse);
      }
    });

    expect(aiAssistantService.getActivityGuidedConversationResponse).toHaveBeenCalled();
  }));

  it('should handle successful freeform response', fakeAsync(() => {
    const mockStartResponse = { conversationId: 'test-conv-id' };
    const mockResponse = {
      type: 'demo',
      data: {
        message: 'Freeform response',
        questions: ''
      }
    };

    jest.spyOn(aiAssistantService, 'getFreeformConversationResponse')
      .mockReturnValue(of(mockResponse));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });

    component.getFreeformResponse(mockCurrentMessage, mockStartResponse).subscribe({
      next: (response) => {
        expect(response).toEqual(mockResponse);
      }
    });

    expect(aiAssistantService.getFreeformConversationResponse).toHaveBeenCalled();
  }));

  it('should build chat conversation from raw data', () => {
    const mockRawData = {
      messageId: 'msg-123',
      conversationId: 'conv-456',
      promptinput: 'Test prompt',
      promptResponse: 'Test response',
      promptType: 'FREEFORM',
      questions: 'Question 1\nQuestion 2'
    };

    const result = (component as any).buildChat(mockRawData);

    expect(result).toEqual({
      source: '',
      id: 'msg-123',
      conversationId: 'conv-456',
      messageId: 'msg-123',
      promptInput: 'Test prompt',
      promptResponse: 'Test response',
      promptType: 'FREEFORM',
      promptProductType: 'FREEFORM',
      questions: 'Question 1\nQuestion 2'
    });
  });

  it('should handle activity prompt data correctly', () => {
    const mockRawData = {
      activityFormData: JSON.stringify({
        travellers: { adult: 2, child: 1 },
        location: 'Tokyo',
        tripMonth: ['March'],
        activityType: ['Museum', 'Food'],
        additionalPreference: 'Test preference'
      })
    };

    const mockHistory = {
      id: 'test-id',
      promptInput: '',
      promptGuidedRequest: [],
      activityFormData: null
    };

    const result = (component as any).handleActivityPrompt(mockRawData, mockHistory);

    expect(result.activityFormData).toEqual({
      travelersCount: { adults: 2, children: 1 },
      tripDestination: 'Tokyo',
      tripMonth: 'March',
      tripActivities: ['Museum', 'Food'],
      tripAdditionals: 'Test preference'
    });
    expect(result.promptGuidedRequest).toBeDefined();
  });

  it('should handle hotel prompt data correctly', () => {
    const mockRawData = {
      hotelFormData: JSON.stringify({
        Travellers: { Adult: 3, Child: 1 },
        Location: 'Paris',
        Rating: ['4'],
        TripType: ['Leisure'],
        TripMonth: ['June'],
        HotelLoyaltyProgram: ['Marriott'],
        AdditionalPreference: 'Near Eiffel Tower'
      })
    };

    const mockHistory = {
      id: 'test-id',
      promptInput: '',
      promptGuidedRequest: [],
      hotelFormData: null
    };

    const result = (component as any).handleHotelPrompt(mockRawData, mockHistory);

    expect(result.hotelFormData).toEqual({
      travelersCount: { adults: 3, children: 1 },
      whereTo: 'Paris',
      starRating: '4 start',
      tripType: 'Leisure',
      tripMonth: 'June',
      hotelLoyaltyProgram: 'Marriott',
      additionalPreferences: 'Near Eiffel Tower'
    });
    expect(result.promptGuidedRequest).toBeDefined();
  });

  it('should handle freeform prompt data correctly', () => {
    const mockRawData = {
      promptinput: JSON.stringify({
        Message: 'Tell me about hotels in Tokyo'
      })
    };

    const mockHistory = {
      id: 'test-id',
      promptInput: 'Original prompt'
    };

    const result = (component as any).handleFreeformPrompt(mockRawData, mockHistory);

    expect(result.promptInput).toBe('Tell me about hotels in Tokyo');
  });

  it('should generate activity prompt summary correctly', () => {
    const mockActivityData = {
      travelersCount: { adults: 2, children: 1 },
      tripDestination: 'Tokyo',
      tripMonth: 'March',
      tripActivities: ['Museum', 'Food Tour'],
      tripAdditionals: 'Family trip'
    };

    const summary = (component as any).getActivityPromptSummary(mockActivityData);

    expect(summary).toHaveLength(5);
    expect(summary[0].question).toBeDefined();
    expect(summary[0].answer).toBe('2 adults, 1 children');
    expect(summary[1].answer).toBe('Tokyo');
    expect(summary[2].answer).toBe('March');
    expect(summary[3].answer).toBe('Museum, Food Tour');
    expect(summary[4].answer).toBe('Family trip');
  });

  it('should generate hotel prompt summary correctly', () => {
    const mockHotelData = {
      travelersCount: { adults: 3, children: 0 },
      whereTo: 'Paris',
      tripMonth: 'June',
      starRating: '4 star',
      tripType: 'Business',
      hotelLoyaltyProgram: 'Hilton Honors',
      additionalPreferences: 'Near airport'
    };

    const summary = (component as any).getHotelPromptSummary(mockHotelData);

    expect(summary).toHaveLength(7);
    expect(summary[0].question).toBeDefined();
    expect(summary[0].answer).toBe('3 adults, 0 children');
    expect(summary[1].answer).toBe('Paris');
    expect(summary[2].answer).toBe('June');
    expect(summary[3].answer).toBe('4 star');
    expect(summary[4].answer).toBe('Business');
    expect(summary[5].answer).toBe('Hilton Honors');
    expect(summary[6].answer).toBe('Near airport');
  });

  it('should generate prompt summary with placeholders for empty data', () => {
    const mockActivityData = {
      travelersCount: { adults: 0, children: 0 },
      tripDestination: '',
      tripMonth: '',
      tripActivities: [],
      tripAdditionals: ''
    };

    const summary = (component as any).getActivityPromptSummary(mockActivityData);

    expect(summary[0].answer).toBe('0 adults, 0 children');
    expect(summary[1].answer).toBe(PROMPT_EMPTY_FIELD_PLACEHOLDER);
    expect(summary[2].answer).toBe(PROMPT_EMPTY_FIELD_PLACEHOLDER);
    expect(summary[3].answer).toBe(PROMPT_EMPTY_FIELD_PLACEHOLDER);
    expect(summary[4].answer).toBe(PROMPT_EMPTY_FIELD_PLACEHOLDER);
  });

  it('should refresh proposal details', () => {
    component.proposalId = 'test-proposal-id';
    const getConversationDetailsSpy = jest.spyOn(component as any, 'getConversationDetails').mockImplementation(() => { });

    component.refreshProposalClick();

    expect(getConversationDetailsSpy).toHaveBeenCalledWith('test-proposal-id');
  });

  it('should retry summary generation successfully', fakeAsync(() => {
    component.proposalId = 'test-proposal-id';
    const mockResponse = {};

    jest.spyOn(aiAssistantService, 'generateSummaryByProposalId')
      .mockReturnValue(of(mockResponse));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });
    const getConversationDetailsSpy = jest.spyOn(component as any, 'getConversationDetails').mockImplementation(() => { });

    component.retrySummaryGenerationClick();

    tick();

    expect(aiAssistantService.generateSummaryByProposalId).toHaveBeenCalledWith('test-proposal-id');
    expect(getConversationDetailsSpy).toHaveBeenCalledWith('test-proposal-id');
  }));

  it('should handle retry summary generation error', fakeAsync(() => {
    component.proposalId = 'test-proposal-id';
    const mockError = new HttpErrorResponse({
      status: 500,
      statusText: 'Internal Server Error'
    });

    jest.spyOn(aiAssistantService, 'generateSummaryByProposalId')
      .mockReturnValue(throwError(() => mockError));

    jest.spyOn(appsCommonService.client.logger, 'logException').mockImplementation(() => { });

    component.retrySummaryGenerationClick();

    tick();

    expect(aiAssistantService.generateSummaryByProposalId).toHaveBeenCalledWith('test-proposal-id');
    expect((component as any).snackBarService.show).toHaveBeenCalled();
  }));

  it('should get conversation details successfully', fakeAsync(() => {
    const mockResponse = {
      activeConversations: [
        {
          messageId: 'msg-1',
          conversationId: 'conv-1',
          promptinput: 'Test prompt',
          promptResponse: 'Test response',
          promptType: 'FREEFORM',
          questions: 'Question 1\nQuestion 2'
        }
      ]
    };

    jest.spyOn(aiAssistantService, 'getConversationDetails')
      .mockReturnValue(of(mockResponse));

    jest.spyOn(store, 'select').mockReturnValue(of('test-token'));

    component.getConversationDetails('test-proposal-id');

    tick();

    expect(component.chatConversations).toHaveLength(1);
    expect(component.chatConversations[0].id).toBe('msg-1');
    expect(component.chatConversations[0].promptInput).toBe('Test prompt');
    expect(component.chatConversations[0].questions).toBe('Question 1\nQuestion 2');
    expect(component.suggestions).toEqual([
      { text: 'Question 1' },
      { text: 'Question 2' }
    ]);
  }));

  it('should handle conversation details with activity form data', fakeAsync(() => {
    const mockResponse = {
      activeConversations: [
        {
          messageId: 'msg-1',
          conversationId: 'conv-1',
          promptType: 'ACTIVITY',
          activityFormData: JSON.stringify({
            travellers: { adult: 2, child: 1 },
            location: 'Tokyo',
            tripMonth: ['March'],
            activityType: ['Museum'],
            additionalPreference: 'Test'
          })
        }
      ]
    };

    jest.spyOn(aiAssistantService, 'getConversationDetails')
      .mockReturnValue(of(mockResponse));

    jest.spyOn(store, 'select').mockReturnValue(of('test-token'));

    component.getConversationDetails('test-proposal-id');

    tick();

    expect(component.chatConversations).toHaveLength(1);
    expect(component.chatConversations[0].activityFormData).toBeDefined();
    expect(component.chatConversations[0].activityFormData?.travelersCount.adults).toBe(2);
  }));

  it('should handle conversation details with hotel form data', fakeAsync(() => {
    const mockResponse = {
      activeConversations: [
        {
          messageId: 'msg-1',
          conversationId: 'conv-1',
          promptType: 'HOTEL',
          hotelFormData: JSON.stringify({
            Travellers: { Adult: 3, Child: 1 },
            Location: 'Paris',
            Rating: ['4'],
            TripType: ['Business'],
            TripMonth: ['June'],
            HotelLoyaltyProgram: ['Hilton'],
            AdditionalPreference: 'Near airport'
          })
        }
      ]
    };

    jest.spyOn(aiAssistantService, 'getConversationDetails')
      .mockReturnValue(of(mockResponse));

    jest.spyOn(store, 'select').mockReturnValue(of('test-token'));

    component.getConversationDetails('test-proposal-id');

    tick();

    expect(component.chatConversations).toHaveLength(1);
    expect(component.chatConversations[0].hotelFormData).toBeDefined();
    expect(component.chatConversations[0].hotelFormData?.travelersCount.adults).toBe(3);
  }));

  it('should handle conversation details error', fakeAsync(() => {
    const mockError = new HttpErrorResponse({
      status: 500,
      statusText: 'Internal Server Error'
    });

    jest.spyOn(aiAssistantService, 'getConversationDetails')
      .mockReturnValue(throwError(() => mockError));

    jest.spyOn(store, 'select').mockReturnValue(of('test-token'));

    component.getConversationDetails('test-proposal-id');

    tick();

    expect(component.chatTemplates).toBe(ChatTemplates.SOMETHING_WENT_WRONG);
  }));

  it('should handle missing token in getConversationDetails', fakeAsync(() => {
    jest.spyOn(aiAssistantService, 'getConversationDetails')
      .mockReturnValue(of({}));

    jest.spyOn(store, 'select').mockReturnValue(of(null));

    jest.spyOn(appsCommonService.client.logger, 'logTrace').mockImplementation(() => { });

    component.getConversationDetails('test-proposal-id');

    tick();

    expect(appsCommonService.client.logger.logTrace).toHaveBeenCalled();
  }));

  it('copyPromptResponse should handle null input', async () => {
    await component.copyPromptResponse(null);
    expect((navigator as any).clipboard.writeText).not.toHaveBeenCalled();
    expect((component as any).snackBarService.show).not.toHaveBeenCalled();
  });

  it('copyPromptResponse should handle undefined input', async () => {
    await component.copyPromptResponse(undefined);
    expect((navigator as any).clipboard.writeText).not.toHaveBeenCalled();
    expect((component as any).snackBarService.show).not.toHaveBeenCalled();
  });

  it('copyPromptResponse should handle empty string input', async () => {
    await component.copyPromptResponse('');
    expect((navigator as any).clipboard.writeText).toHaveBeenCalledWith('');
    expect((component as any).snackBarService.show).toHaveBeenCalled();
  });

  it('should handle updateScrollFlags with scroll at bottom', () => {
    component.chatContentRef.nativeElement.scrollTop = 600;
    component.chatContentRef.nativeElement.scrollHeight = 1000;
    component.chatContentRef.nativeElement.clientHeight = 400;

    component.updateScrollFlags();

    expect(component.isScrolledToBottom).toBe(true);
  });

  it('should handle updateScrollFlags with scroll not at bottom', () => {
    component.chatContentRef.nativeElement.scrollTop = 300;
    component.chatContentRef.nativeElement.scrollHeight = 1000;
    component.chatContentRef.nativeElement.clientHeight = 400;

    component.updateScrollFlags();

    expect(component.isScrolledToBottom).toBe(false);
  });

  it('should handle edge case with scrollTop greater than scrollHeight', () => {
    component.chatContentRef.nativeElement.scrollTop = 1200;
    component.chatContentRef.nativeElement.scrollHeight = 1000;
    component.chatContentRef.nativeElement.clientHeight = 400;

    component.updateScrollFlags();

    expect(component.isScrolledToBottom).toBe(true);
  });

  it('should handle malformed activity form data gracefully', () => {
    const mockRawData = {
      activityFormData: 'invalid-json'
    };

    const mockHistory = {
      id: 'test-id',
      promptInput: '',
      promptGuidedRequest: [],
      activityFormData: null
    };

    expect(() => {
      (component as any).handleActivityPrompt(mockRawData, mockHistory);
    }).toThrow();
  });

  it('should handle malformed hotel form data gracefully', () => {
    const mockRawData = {
      hotelFormData: 'invalid-json'
    };

    const mockHistory = {
      id: 'test-id',
      promptInput: '',
      promptGuidedRequest: [],
      hotelFormData: null
    };

    expect(() => {
      (component as any).handleHotelPrompt(mockRawData, mockHistory);
    }).toThrow();
  });

  it('should handle malformed freeform data gracefully', () => {
    const mockRawData = {
      promptinput: 'invalid-json'
    };

    const mockHistory = {
      id: 'test-id',
      promptInput: 'Original prompt'
    };

    expect(() => {
      (component as any).handleFreeformPrompt(mockRawData, mockHistory);
    }).toThrow();
  });
});