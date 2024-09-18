import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import {
  Component,
  ComponentFactoryResolver,
  ElementRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  ViewContainerRef,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { UtilsService } from 'src/app/base/utils.sevice';
import { OptionsProductForm } from 'src/app/modules/management/model/options-product-form';
import { AddVaritantProductFormComponent } from '../../component/add-varitant-product-form/add-varitant-product-form.component';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
})
export class ProductDetailComponent implements OnInit {
  @ViewChild('optionsContainer', { read: ViewContainerRef, static: true })
  optionsContainer!: ViewContainerRef;

  loadedOptions: any = {};

  confirmedOptions: any = [];

  productForm: FormGroup;

  config: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: '32rem',
    minHeight: '5rem',
    placeholder: 'Enter text here...',
    translate: 'no',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    toolbarHiddenButtons: [['bold']],
    customClasses: [
      {
        name: 'quote',
        class: 'quote',
      },
      {
        name: 'redText',
        class: 'redText',
      },
      {
        name: 'titleText',
        class: 'titleText',
        tag: 'h1',
      },
    ],
  };

  productGalleryImages: any;
  productMainImage: any;

  listOfCategory = [
    {
      name: 'Hàng dệt & Đồ nội thất mềm - Chăn ga gối đệm - Chăn',
      value: 'Hàng dệt & Đồ nội thất mềm - Chăn ga gối đệm - Chăn',
    },
    {
      name: 'Hạng mục khác...',
      value: 'Hạng mục khác...',
    },
  ];

  isOptions = false;
  isValidNewAddOptions = false;

  listOfOptions = [
    {
      display_name: 'Màu Sắc',
      _id: '5e70047aa2f3c2574a27e4a2',
      isSelected: false,
    },
    {
      display_name: 'Size',
      _id: '5e70047aa2f3c2574a27e4a3',
      isSelected: false,
    },
  ];

  optionsProductForm: OptionsProductForm<string>[] = [];

  variants: any = [];

  constructor(
    private fb: FormBuilder,
    public utilsService: UtilsService,
    private componentFactoryResolver: ComponentFactoryResolver,
  ) {
    this.productForm = new FormGroup({});
  }

  ngOnInit() {
    this.formBuilder();
    this.productImageBuilder();
  }

  ngAfterViewInit(): void {}

  onSubmit() {
    if (!this.productForm.valid) {
      this.markFormGroupTouched(this.productForm);
      return;
    }

    let galleryImage: any = [];

    this.productGalleryImages.forEach((item: any) => {
      if (item.value) galleryImage.push(item.value);
    });

    const productUpsert = {
      name: this.productForm.get('productName')?.value,
      mainImage: this.productMainImage,
      galleryImage: galleryImage,
    };
    console.log('🚀 ~ ProductDetailComponent ~ onSubmit ~ productUpsert:', productUpsert);
  }

  onFileChange(event: any, currentImageIndex: number) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length && currentImageIndex < this.productGalleryImages.length; i++) {
      const file = files[i];
      if (!file || !this.isValidImageFile(file)) continue;

      this.readAndSetImage(file, currentImageIndex);
      currentImageIndex++;
    }
    // Update form control
    this.productForm.patchValue({ productImage: 'Have image' });
  }

  onMainImageFileChange(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file || !this.isValidImageFile(file)) return;

    const reader = new FileReader();
    reader.onload = (event: any) => {
      this.productMainImage = this.productMainImage;
      this.productMainImage.value = event.target.result;
      this.productMainImage.disable = true;
      // Enable next image slot if available
      const nextImage = this.productGalleryImages.find((item: any) => item.value == null);
      nextImage.disable = false;
    };
    reader.readAsDataURL(file);
  }

  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  private readAndSetImage(file: File, index: number): void {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      const currentImage = this.productGalleryImages[index];
      currentImage.value = event.target.result;
      currentImage.disable = true;

      // Enable next image slot if available
      if (index + 1 < this.productGalleryImages.length) {
        const nextImage = this.productGalleryImages[index + 1];
        nextImage.disable = false;
      }
    };
    reader.readAsDataURL(file);
  }

  removeFileImage(currentImageIndex: number): void {
    // Clear the current image
    this.clearImage(currentImageIndex);

    // Shift remaining images to fill the gap
    this.shiftImagesUp(currentImageIndex);

    // Update the disabled state of all images
    this.updateImageStates();
    this.productForm.patchValue({ productImage: '' });
    console.log(
      '🚀 ~ ProductDetailComponent ~ removeFileImage ~ this.productGalleryImages:',
      this.productGalleryImages,
    );
  }

  removeMainImageFileImage(): void {
    // Clear the  image
    this.productMainImage.value = null;
    this.productMainImage.disable = false;

    const nextImage = this.productGalleryImages.find((item: any) => item.disable == false);
    if (!nextImage.value) {
      nextImage.disable = true;
    }

    this.productForm.patchValue({ productMainImage: '' });
  }

  private clearImage(index: number): void {
    this.productGalleryImages[index].value = null;
    this.productGalleryImages[index].disable = false;
  }

  private shiftImagesUp(startIndex: number): void {
    for (let i = startIndex; i < this.productGalleryImages.length - 1; i++) {
      if (this.productGalleryImages[i].value === null && this.productGalleryImages[i + 1].value !== null) {
        this.productGalleryImages[i].value = this.productGalleryImages[i + 1].value;
        this.productGalleryImages[i + 1].value = null;
        this.productGalleryImages[i].disable = true;
      }
    }
  }

  private updateImageStates(): void {
    let firstEmptySlotFound = false;

    for (let i = 0; i < this.productGalleryImages.length; i++) {
      if (this.productGalleryImages[i].value === null && !firstEmptySlotFound) {
        this.productGalleryImages[i].disable = false;
        firstEmptySlotFound = true;
      } else {
        this.productGalleryImages[i].disable = true;
      }
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  formBuilder() {
    this.productForm = this.fb.group({
      productName: ['', [Validators.required, Validators.minLength(25)]],
      productMainImage: ['', Validators.required],
      productCate: ['', Validators.required],
    });
  }

  productImageBuilder() {
    this.productMainImage = {
      name: 'Tải lên ảnh chỉnh',
      attrs: ['Kích thước: 300x300 px', 'Kích thước tập tin tối đa: 5MB', 'Format: JPG, JPEG, PNG'],
      formControlName: 'mainImage',
      value: null,
      icon: 'assets/icons/heroicons/outline/media-image.svg',
      disable: false,
    };

    this.productGalleryImages = [
      {
        name: 'Chính Diện',
        value: null,
        icon: './assets/images/front.png',
        disable: true,
      },
      {
        name: 'Cạnh Bên',
        value: null,
        icon: './assets/images/side.png',
        disable: true,
      },
      {
        name: 'Góc Độ Khác',
        value: null,
        icon: './assets/images/another-angle.png',
        disable: true,
      },
      {
        name: 'Đang sử dụng',
        value: null,
        icon: './assets/images/using.png',
        disable: true,
      },
      {
        name: 'Biến Thể',
        value: null,
        icon: './assets/images/variant.png',
        disable: true,
      },
      {
        name: 'Cảnh nền',
        value: null,
        icon: './assets/images/background-perspective.png',
        disable: true,
      },
      {
        name: 'Chụp cận',
        value: null,
        icon: './assets/images/close-up-photo.png',
        disable: true,
      },
      {
        name: 'Kích Thước',
        value: null,
        icon: './assets/images/size-box.png',
        disable: true,
      },
    ];
    console.log('🚀 ~ ProductDetailComponent ~ productImageBuilder ~ productGalleryImages:', this.productGalleryImages);
  }

  drop(event: CdkDragDrop<object[]>) {
    moveItemInArray(this.productGalleryImages, event.previousIndex, event.currentIndex);
  }

  turnOnOffOptions() {
    if (!this.isOptions) {
      this.turnOffOptions();
      return;
    }
    this.addOption();
  }

  turnOffOptions() {
    for (let idx in this.loadedOptions) {
      this.productForm.removeControl('option');
      this.loadedOptions[idx].destroy();
    }
    this.loadedOptions = {};
    this.isOptions = false;
    return;
  }

  addOption() {
    let optionsForm = this.productForm.controls['options'] as FormGroup;

    let componentFactory = this.componentFactoryResolver.resolveComponentFactory(AddVaritantProductFormComponent);
    let componentRef = this.optionsContainer.createComponent(componentFactory);

    let ref: any = componentRef.instance;

    const uId = uuid();

    if (!optionsForm) {
      this.productForm.addControl('options', this.fb.group({}));
      optionsForm = this.productForm.controls['options'] as FormGroup;
      optionsForm.setValidators(this.customOptionsValidator);
    }

    optionsForm.addControl(
      'option-' + uId,
      this.fb.group({
        option_id: ['', Validators.required],
        option_values: this.fb.array([]),
      }),
    );

    console.log('🚀 ~ ProductDetailComponent ~ addOption ~ this.productForm:', this.productForm);

    const formOptionsGroup = optionsForm.controls['option-' + uId];

    formOptionsGroup.setValidators(this.customOptionValueValidator);

    const countLoadedOptions = Object.getOwnPropertyNames(this.loadedOptions).length;

    const isFixedForm = countLoadedOptions <= 0;

    ref.init(uId, formOptionsGroup, isFixedForm, this.listOfOptions); // Will be used to know which index should be removed

    this.loadedOptions[uId] = componentRef;

    this.eventEmitDeletion(ref);
    this.evnetEmitOptions(ref);
    this.evnetEmitOpenSetupOption(ref);

    this.isValidNewAddOptions = optionsForm?.valid;
  }

  customOptionValueValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const formGroup = control as FormGroup;
    const option_id = formGroup.get('option_id');
    const option_values = formGroup.get('option_values');

    if ((option_id?.value && option_id.valid) || (option_values?.value && option_values.valid)) {
      return null; // null => valid
    } else {
      return { optionInvalid: true }; // validation errors => not valid
    }
  };

  customOptionsValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const formGroup = control as FormGroup;

    let formGroupValid = false;

    Object.values(formGroup.controls).forEach((control) => {
      formGroupValid = control.valid;
    });

    if (formGroupValid) {
      return null; // null => valid
    } else {
      return { optionsGroupInvalid: true }; // validation errors => not valid
    }
  };

  eventEmitDeletion(ref: any) {
    // Subscribing to the EventEmitter from the option
    ref.emitDeletion.subscribe((index: number) => {
      this._removeOption(index);
    });
  }

  evnetEmitOptions(ref: any) {
    // Subscribing to the EventEmitter from the option
    ref.emitOptionsAndVariants.subscribe((uId: any) => {
      let optionsForm = this.productForm.controls['options'] as FormGroup;
      const formOptionsGroup = optionsForm.controls['option-' + uId];
      const option = formOptionsGroup.getRawValue();
      console.log('🚀 ~ ProductDetailComponent ~ addOption ~ this.productForm: 1111111111', this.productForm);

      //check isValidNewAddOptions
      this.listOfOptions.forEach((o: any) => {
        if (o._id == option.option_id) {
          o.isSelected = true;
          this.isValidNewAddOptions = false;
        } else {
          this.isValidNewAddOptions = true;
        }
      });

      console.log('🚀 ~ ProductDetailComponent ~ this.listOfOptions.map ~ this.listOfOptions:', this.listOfOptions);

      const existConfirmedOptions = this.confirmedOptions.find((c: any) => c.option_id == option.option_id);
      if (existConfirmedOptions) {
        existConfirmedOptions.option_values = option.option_values;
      } else {
        this.confirmedOptions.push(option);
      }
      this.variants = this.createVariants();
    });
  }

  evnetEmitOpenSetupOption(ref: any) {
    ref.emitOpenSetupOptionsAndVariants.subscribe((uId: any) => {
      let optionsForm = this.productForm.controls['options'] as FormGroup;
      const formOptionsGroup = optionsForm.controls['option-' + uId];
      const option = formOptionsGroup.getRawValue();

      const idxConfirmedOptions = this.confirmedOptions.findIndex((c: any) => c.option_id == option.option_id);
      this.confirmedOptions.splice(idxConfirmedOptions, 1);
      // this.confirmedOptions.push(option);
      this.variants = this.createVariants();
      console.log(
        '🚀 ~ ProductDetailComponent ~ ref.emitOpenSetupOptionsAndVariants.subscribe ~ this.variants:',
        this.variants,
      );
    });
  }

  private createVariants() {
    if (this.confirmedOptions.length <= 0) {
      return [];
    }
    let sets = [[]];
    this.confirmedOptions.forEach((option: any) => {
      if (option) {
        const newsets: any = [];
        option.option_values.forEach((v: any) => {
          v.option_id = option.option_id;
          newsets.push(Array.from(sets, (set) => [...set, v]));
        });
        sets = newsets.flatMap((set: any) => set);
      }
    });

    return sets.map((set) => ({
      price: 0,
      upc: '000000000234',
      sku: '',
      option_values: set,
    }));
  }

  getOption(id: any) {
    const options = this.listOfOptions.find((option: any) => option._id == id);
    return options;
  }

  private _removeOption(index: number) {
    this.loadedOptions[index].destroy();
    delete this.loadedOptions[index];
    this.productForm.removeControl('option' + index);
    if (this.loadedOptions.length <= 0) {
      this.turnOffOptions();
    }
  }

  // addOption() {
  //   this.productForm.addControl(
  //     'option' + this.idxOption,
  //     this.fb.group({
  //       optionName: ['', Validators.required],
  //       variants: this.fb.array([]),
  //     }),
  //   );
  //   console.log("🚀 ~ ProductDetailComponent ~ addOption ~ this.productForm:", this.productForm)
  //   this.idxOption += 1;

  //   // this.optionsComponent.map((vcr: any, index: number) => {
  //   //   console.log('🚀 ~ ProductDetailComponent ~ addOption ~ vcr:', vcr.nativeElement);
  //   //   this.utilsService.createComponent(AddVaritantProductFormComponent, vcr.nativeElement, {
  //   //     formOptionsGroup: this.productForm.controls['option' + this.idxOption],
  //   //   });
  //   // });
  //   // console.log('🚀 ~ ProductDetailComponent ~ addOption ~ this.optionsComponent:', this.optionsComponent);
  // }
}
