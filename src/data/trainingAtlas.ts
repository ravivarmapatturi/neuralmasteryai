export const trainingEras = [
  {
    id: 'foundations',
    label: 'Foundations',
    years: '1951–2016',
    narrative: 'Training began with local error corrections, then gained a chain rule, stochastic updates, controlled inertia, adaptive steps, and explicit defenses against unstable or memorized solutions.',
  },
  {
    id: 'sequence-vision',
    label: 'Sequence and vision',
    years: '1989–2019',
    narrative: 'Once dense networks could learn, the next question was how to preserve structure: time in a sequence, locality in an image, and reusable features across tasks.',
  },
  {
    id: 'transformer-scale',
    label: 'Transformer-scale training',
    years: '1989–2020',
    narrative: 'Autoregressive objectives supplied a universal target, while systems techniques made the resulting models fit in memory and train across many accelerators.',
  },
  {
    id: 'self-supervised',
    label: 'Self-supervised representation learning',
    years: '2020–2023',
    narrative: 'Labels remained scarce, so representation learning turned each example into its own supervision through paired views, masked reconstruction, or prediction in representation space.',
  },
  {
    id: 'post-training',
    label: 'Adaptation and post-training',
    years: '2009–2024',
    narrative: 'A capable pretrained model is not yet a useful assistant. Post-training progressively reduced adaptation cost and replaced fragile reward optimization with simpler preference objectives and verifiable reasoning signals.',
  },
] as const;

export type TrainingEraId = (typeof trainingEras)[number]['id'];

export type TrainingCategory =
  | 'optimization'
  | 'regularization'
  | 'architecture'
  | 'systems'
  | 'self-supervision'
  | 'adaptation'
  | 'alignment'
  | 'data-selection';

export type TrainingDiagramKind =
  | 'perceptron' | 'backprop' | 'sgd' | 'momentum' | 'adam' | 'adamw'
  | 'regularization' | 'dropout' | 'batch-norm' | 'layer-norm' | 'early-stopping'
  | 'lr-schedules' | 'initialization' | 'bptt' | 'cnn-training' | 'transfer-learning'
  | 'augmentation' | 'next-token' | 'teacher-forcing' | 'mixed-precision'
  | 'gradient-checkpointing' | 'gradient-accumulation' | 'distributed-training'
  | 'contrastive' | 'mae' | 'jepa' | 'sft' | 'lora' | 'qlora' | 'prefix-tuning'
  | 'instruction-tuning' | 'rlhf-ppo' | 'dpo' | 'constitutional-ai' | 'kto'
  | 'grpo' | 'distillation' | 'curriculum' | 'active-learning';

export interface TrainingAtlasEntry {
  id: string;
  name: string;
  year: number;
  era: TrainingEraId;
  category: TrainingCategory;
  source: { label: string; url: string };
  whatItIs: string;
  previousLimit: string;
  dataPreparation: string;
  example: string;
  metrics: string;
  whenNotToUse: string;
  replacedBy: string;
  cameBefore: string;
  ledTo: string;
  learnPath: string;
  diagram: TrainingDiagramKind;
}

export const trainingAtlas: TrainingAtlasEntry[] = [
  {
    id: 'sgd', name: 'Stochastic gradient descent', year: 1951, era: 'foundations', category: 'optimization', diagram: 'sgd',
    source: { label: 'Robbins and Monro, 1951', url: 'https://doi.org/10.1214/aoms/1177729586' },
    whatItIs: 'SGD estimates a full-dataset gradient from one example or a small random minibatch, then steps against that estimate. It made repeated optimization practical when computing an exact batch gradient was too expensive.',
    previousLimit: 'Exact gradient methods had to scan all observations before every update.',
    dataPreparation: 'Shuffle labeled rows, split them into minibatches, and scale numeric features. Example row: x=[2.0, 1.0], y=1; four such rows form one minibatch.',
    example: 'For gradient g=[0.4, -0.2] and learning rate 0.1, w=[1.0, 1.0] becomes [0.96, 1.02].',
    metrics: 'Plot training loss against both updates and examples seen; noisy steps are expected, but the smoothed loss should fall. Compare validation loss at equal data budgets.',
    whenNotToUse: 'Avoid plain SGD when gradients are very sparse or coordinates have persistently different scales unless careful schedules and momentum are available.',
    replacedBy: 'Momentum and adaptive optimizers usually replace the plain update, while preserving its minibatch estimate.',
    cameBefore: 'Full-batch gradient and stochastic approximation', ledTo: 'Momentum and minibatch neural-network training',
    learnPath: '/docs/machine-learning/sgd-classifier-regressor',
  },
  {
    id: 'perceptron', name: 'Perceptron learning rule', year: 1958, era: 'foundations', category: 'optimization', diagram: 'perceptron',
    source: { label: 'Rosenblatt, 1958', url: 'https://doi.org/10.1037/h0042519' },
    whatItIs: 'The perceptron forms a weighted sum, applies a threshold, and changes weights only after a mistake. It provided an explicit data-driven update for a linear decision boundary rather than requiring hand-set weights.',
    previousLimit: 'Earlier threshold units described computation but did not supply a practical supervised learning rule.',
    dataPreparation: 'Encode each example as numeric features and a target in {-1,+1}, often with a constant bias feature. Example: x=[1, 0.8, 0.2], y=+1.',
    example: 'If w·x predicts -1 for y=+1, η=0.1 adds 0.1x to w; a correct row makes no update.',
    metrics: 'Track mistakes per epoch and margin y(w·x). Zero training mistakes are guaranteed only for linearly separable data.',
    whenNotToUse: 'Do not use it for nonlinearly separable patterns such as XOR or when calibrated probabilities matter.',
    replacedBy: 'Differentiable multilayer networks trained with backpropagation handle nonlinear boundaries.',
    cameBefore: 'Fixed threshold logic units', ledTo: 'Trainable linear classifiers and multilayer networks',
    learnPath: '/docs/deep-learning/neural-network-fundamentals',
  },
  {
    id: 'regularization', name: 'Weight decay and L2 regularization', year: 1991, era: 'foundations', category: 'regularization', diagram: 'regularization',
    source: { label: 'Krogh and Hertz, 1991', url: 'https://proceedings.neurips.cc/paper/1991/hash/8eefcfdf5990e441f0fb6f3fad709e21-Abstract.html' },
    whatItIs: 'L2 regularization adds a penalty proportional to squared weights; weight decay shrinks weights during the update. It discourages brittle high-magnitude fits that minimize training error yet generalize poorly.',
    previousLimit: 'Unconstrained empirical-risk minimization could memorize small or noisy datasets.',
    dataPreparation: 'Prepare the task data normally, then mark parameters subject to decay; biases and normalization scales are commonly excluded. Example row: x=[0.2, 1.4], y=0 plus λ=0.01.',
    example: 'A data gradient of 0.3 and L2 term λw=0.02 produce total gradient 0.32 for w=2 and λ=0.01.',
    metrics: 'Read training and validation loss together, plus weight norms. Stronger regularization usually raises training loss; it is useful only if validation performance improves.',
    whenNotToUse: 'Avoid indiscriminate decay on every parameter or when underfitting is already visible.',
    replacedBy: 'It remains standard and is combined with augmentation, dropout, early stopping, and decoupled AdamW decay.',
    cameBefore: 'Unpenalized loss minimization', ledTo: 'Modern regularization stacks and AdamW',
    learnPath: '/docs/deep-learning/initialization-regularization-scheduling',
  },
  {
    id: 'backprop', name: 'Backpropagation', year: 1986, era: 'foundations', category: 'optimization', diagram: 'backprop',
    source: { label: 'Rumelhart, Hinton, and Williams, 1986', url: 'https://doi.org/10.1038/323533a0' },
    whatItIs: 'Backpropagation applies the chain rule from the loss back through each operation, reusing intermediate derivatives. It gave hidden layers credit assignments that the perceptron rule could not compute.',
    previousLimit: 'Single-layer mistake corrections could not train internal features in multilayer nonlinear networks.',
    dataPreparation: 'Pair numeric inputs with targets, normalize inputs, and retain forward activations for the reverse pass. Example: x=[0,1], y=1 for a two-layer XOR network.',
    example: 'For y=1, prediction 0.7, and sigmoid output, the output-logit derivative under cross-entropy is 0.7-1=-0.3; upstream weights receive that signal times local derivatives.',
    metrics: 'Track loss and validation performance; inspect gradient norms by layer. Near-zero early-layer norms indicate vanishing gradients, while nonfinite or rapidly growing norms indicate explosion.',
    whenNotToUse: 'Reverse-mode backprop is wasteful for a function with very few inputs and many outputs, where forward-mode differentiation may be cheaper.',
    replacedBy: 'Automatic differentiation implements the same reverse-mode principle; residual paths and normalization make it stable at depth.',
    cameBefore: 'Perceptron mistake updates', ledTo: 'Deep networks, BPTT, and automatic differentiation',
    learnPath: '/docs/deep-learning/training-deep-networks',
  },
  {
    id: 'momentum', name: 'Momentum', year: 1964, era: 'foundations', category: 'optimization', diagram: 'momentum',
    source: { label: 'Polyak, 1964', url: 'https://doi.org/10.1016/0041-5553(64)90137-5' },
    whatItIs: 'Momentum keeps an exponentially weighted velocity of past gradients and updates along that velocity. It damps alternating motion across a narrow valley while accumulating progress along its stable direction.',
    previousLimit: 'Plain SGD zig-zagged across high-curvature directions and advanced slowly along shallow ones.',
    dataPreparation: 'Use shuffled minibatches as for SGD and initialize one zero velocity tensor per parameter. Example gradients across two steps: [1,-1], then [1,1].',
    example: 'With β=0.9, v₀=0 and g₁=[1,-1], v₁=[1,-1]; the next velocity is 0.9v₁+[1,1]=[1.9,0.1].',
    metrics: 'Compare loss per update and velocity-to-weight norm. Oscillation should shrink; a velocity that dominates weights or causes loss spikes signals excessive learning rate or momentum.',
    whenNotToUse: 'Skip it for tiny convex problems solved exactly, or when an adaptive optimizer is already required for sparse gradients.',
    replacedBy: 'Nesterov momentum and adaptive moments extend it; SGD with momentum remains a strong vision baseline.',
    cameBefore: 'Plain stochastic gradient descent', ledTo: 'Nesterov acceleration and Adam first moments',
    learnPath: '/docs/deep-learning/optimizers',
  },
  {
    id: 'early-stopping', name: 'Early stopping', year: 1998, era: 'foundations', category: 'regularization', diagram: 'early-stopping',
    source: { label: 'Prechelt, 1998', url: 'https://doi.org/10.1007/3-540-49430-8_3' },
    whatItIs: 'Early stopping checkpoints the model and ends training after validation performance stops improving. It limits the later phase in which optimization keeps fitting training noise.',
    previousLimit: 'Fixed epoch counts either stopped useful learning too soon or continued into overfitting.',
    dataPreparation: 'Create a validation split that matches deployment and never use it for gradient updates. Example: 800 train rows, 100 validation rows, patience=3 evaluations.',
    example: 'Validation losses 0.42, 0.38, 0.39, 0.40, 0.41 restore the checkpoint at 0.38 after three non-improvements.',
    metrics: 'Monitor the deployment-aligned validation metric and its noise, not training loss alone. Patience shorter than normal metric variance produces premature stops.',
    whenNotToUse: 'Do not tune repeatedly on a tiny or shifted validation set, and do not treat a stopped checkpoint as an unbiased final estimate.',
    replacedBy: 'It remains a checkpoint-selection method, often paired with scheduled training and a separate test set.',
    cameBefore: 'Fixed training duration', ledTo: 'Validation-based checkpoint selection',
    learnPath: '/docs/deep-learning/initialization-regularization-scheduling',
  },
  {
    id: 'initialization', name: 'Variance-preserving initialization', year: 2010, era: 'foundations', category: 'optimization', diagram: 'initialization',
    source: { label: 'Glorot and Bengio, 2010', url: 'https://proceedings.mlr.press/v9/glorot10a.html' },
    whatItIs: 'Xavier initialization scales random weights by fan-in and fan-out so activations and gradients keep comparable variance across layers. It addressed deep sigmoid and tanh networks whose signals saturated immediately under naive random scales.',
    previousLimit: 'Arbitrary small or large random weights caused vanishing activations, saturation, or exploding gradients before learning began.',
    dataPreparation: 'Normalize features, choose the rule for the activation, and sample each matrix using its fan counts. Example layer: 4 inputs and 3 outputs give fan_in=4 and fan_out=3.',
    example: 'Xavier uniform samples from ±sqrt(6/(4+3))≈±0.926 for that layer; He initialization later uses variance 2/fan_in for ReLU.',
    metrics: 'Before training, inspect activation means/variances and gradient norms by depth. Healthy initialization avoids monotonic collapse or growth through the stack.',
    whenNotToUse: 'Do not use Xavier unchanged for ReLU-heavy networks; use an activation-aware rule such as He initialization.',
    replacedBy: 'He initialization, residual scaling, and architecture-specific initializers refine variance preservation.',
    cameBefore: 'Arbitrary random weight scales', ledTo: 'He initialization and stable deep starts',
    learnPath: '/docs/deep-learning/initialization-regularization-scheduling',
  },
  {
    id: 'dropout', name: 'Dropout', year: 2014, era: 'foundations', category: 'regularization', diagram: 'dropout',
    source: { label: 'Srivastava et al., 2014', url: 'https://jmlr.org/papers/v15/srivastava14a.html' },
    whatItIs: 'Dropout independently masks activations during training and rescales survivors, so no feature can rely on a fixed set of partners. It reduced co-adaptation when weight penalties alone still allowed memorization.',
    previousLimit: 'Deterministic hidden units could form fragile feature coalitions on limited labeled data.',
    dataPreparation: 'Prepare examples normally and sample a fresh Bernoulli mask per training pass. Example activation h=[2,1,3,4], keep probability 0.5, mask=[1,0,1,0].',
    example: 'In inverted dropout the result is h·mask/0.5=[4,0,6,0], preserving the expected activation scale.',
    metrics: 'Validation loss is decisive; also compare the train/eval mode gap. Training loss can be higher because noise is active only in training.',
    whenNotToUse: 'Avoid heavy dropout in small underfit models, and do not leave it enabled for deterministic evaluation.',
    replacedBy: 'Augmentation, normalization, stochastic depth, and large-data pretraining often reduce the needed rate; dropout still appears in transformer blocks.',
    cameBefore: 'Weight penalties and deterministic activations', ledTo: 'Stochastic-depth and ensemble-like regularization',
    learnPath: '/docs/deep-learning/initialization-regularization-scheduling',
  },
  {
    id: 'batch-norm', name: 'Batch normalization', year: 2015, era: 'foundations', category: 'architecture', diagram: 'batch-norm',
    source: { label: 'Ioffe and Szegedy, 2015', url: 'https://proceedings.mlr.press/v37/ioffe15.html' },
    whatItIs: 'Batch normalization standardizes each channel using minibatch statistics, then learns a scale and shift. It made higher learning rates and deeper feed-forward networks easier to optimize when activation distributions drifted during training.',
    previousLimit: 'Deep activations changed scale during training, making optimization sensitive to initialization and step size.',
    dataPreparation: 'Form representative minibatches and compute each feature or channel across the batch. Example channel values [1,3,5,7] have mean 4 before normalization.',
    example: 'The four values are centered to [-3,-1,1,3] and divided by sqrt(5+ε), then transformed by learned γ and β.',
    metrics: 'Track loss, activation distributions, and the gap between batch-stat training and running-stat evaluation. Small or non-IID batches make running estimates unreliable.',
    whenNotToUse: 'Avoid it with batch size one, strongly variable sequence padding, or online inference whose distribution differs from stored statistics.',
    replacedBy: 'Layer, group, and RMS normalization remove dependence on other examples for sequence models and small batches.',
    cameBefore: 'Initialization-only control of activation scale', ledTo: 'Layer and group normalization',
    learnPath: '/docs/deep-learning/nn-layers-reference',
  },
  {
    id: 'layer-norm', name: 'Layer normalization', year: 2016, era: 'foundations', category: 'architecture', diagram: 'layer-norm',
    source: { label: 'Ba, Kiros, and Hinton, 2016', url: 'https://arxiv.org/abs/1607.06450' },
    whatItIs: 'Layer normalization standardizes the features inside each example independently. It preserved normalization for recurrent and transformer models where batch statistics vary with sequence length or batch composition.',
    previousLimit: 'Batch normalization coupled each example to its minibatch and behaved poorly for variable-length recurrent states.',
    dataPreparation: 'Keep each token or hidden vector intact and normalize across its feature dimension. Example token vector [1,3,5,7] is one normalization group.',
    example: 'That token is centered by its own mean 4 and variance 5, independent of every other token in the batch.',
    metrics: 'Inspect per-token activation and gradient norms plus validation loss. Compare pre-norm and post-norm stability when depth grows.',
    whenNotToUse: 'Do not assume it preserves absolute feature scale; tasks that need magnitude may require learned paths around normalization.',
    replacedBy: 'RMSNorm often removes mean subtraction, while LayerNorm remains a transformer default.',
    cameBefore: 'Batch-dependent normalization', ledTo: 'Stable recurrent and transformer stacks',
    learnPath: '/docs/deep-learning/nn-layers-reference',
  },
  {
    id: 'adam', name: 'Adam', year: 2014, era: 'foundations', category: 'optimization', diagram: 'adam',
    source: { label: 'Kingma and Ba, 2014', url: 'https://arxiv.org/abs/1412.6980' },
    whatItIs: 'Adam tracks an exponential mean and uncentered variance of gradients, bias-corrects both, and divides the first by the square root of the second. It gave each coordinate an adaptive step when one global SGD rate handled sparse or uneven gradients poorly.',
    previousLimit: 'Momentum accumulated direction but still applied one learning-rate scale to every coordinate.',
    dataPreparation: 'Use shuffled minibatches and initialize first- and second-moment tensors to zero. Example gradient g=[0.01, 1.0] exposes two very different coordinate scales.',
    example: 'On the first step, bias correction makes m̂=g and v̂=g², so both nonzero coordinates receive an update near the base learning rate rather than 100× apart.',
    metrics: 'Track validation loss, update-to-weight ratios, and effective step sizes. A falling training loss does not establish better generalization than tuned momentum SGD.',
    whenNotToUse: 'Avoid treating defaults as universal; some vision settings generalize better with tuned SGD, and coupled L2 behaves differently from true decay.',
    replacedBy: 'AdamW decouples weight decay; later variants change second-moment handling or memory cost.',
    cameBefore: 'Momentum and per-coordinate adaptive rates', ledTo: 'AdamW and dominant transformer optimization',
    learnPath: '/docs/deep-learning/optimizers',
  },
  {
    id: 'adamw', name: 'AdamW', year: 2017, era: 'foundations', category: 'optimization', diagram: 'adamw',
    source: { label: 'Loshchilov and Hutter, 2017', url: 'https://arxiv.org/abs/1711.05101' },
    whatItIs: 'AdamW applies weight decay directly to parameters instead of adding an L2 term to the adaptive gradient. It restored decay as a predictable shrinkage because Adam rescales an L2 gradient coordinate by coordinate.',
    previousLimit: 'In Adam, adding λw to the gradient did not produce uniform multiplicative weight decay.',
    dataPreparation: 'Split parameters into decay and no-decay groups; normalization scales and biases are commonly excluded. Example: matrix W uses decay=0.01 while bias b uses 0.',
    example: 'The step first uses Adam moments for the data gradient, then subtracts ηλW independently of those moments.',
    metrics: 'Tune learning rate and decay separately using validation loss; monitor parameter norms by group to catch accidental decay of biases or norms.',
    whenNotToUse: 'Skip decay for parameters whose scale should remain unconstrained, or when the model already underfits strongly.',
    replacedBy: 'AdamW remains a standard pretrained-transformer optimizer; memory-reduced and sharded implementations change storage, not the rule.',
    cameBefore: 'Adam with coupled L2 penalty', ledTo: 'Reliable adaptive optimization for transformers',
    learnPath: '/docs/deep-learning/optimizers',
  },
  {
    id: 'lr-schedules', name: 'Learning-rate schedules', year: 2016, era: 'foundations', category: 'optimization', diagram: 'lr-schedules',
    source: { label: 'Loshchilov and Hutter, 2016', url: 'https://arxiv.org/abs/1608.03983' },
    whatItIs: 'A schedule changes the learning rate over training; warmup avoids destructive early steps, while decay or cosine annealing shifts from exploration to refinement. It solved the conflict between a rate large enough for fast progress and one small enough for a stable finish.',
    previousLimit: 'One fixed learning rate was either slow throughout or too large near a minimum.',
    dataPreparation: 'Define total optimizer steps before training and map each step to a rate; resume with the scheduler state. Example: warm from 0 to 3e-4 over 100 steps, then cosine-decay to 3e-5.',
    example: 'At warmup step 50 the rate is 1.5e-4; after warmup, cosine curvature lowers it slowly first and fastest near the middle.',
    metrics: 'Plot learning rate beside train and validation loss by step. Divergence during warmup suggests an excessive peak; a flat tail can indicate decay that arrived too early.',
    whenNotToUse: 'Avoid schedule shapes whose horizon is unknown or whose state cannot be restored reliably during elastic training.',
    replacedBy: 'Warmup plus cosine or linear decay is common; schedule-free methods aim to remove explicit horizon tuning.',
    cameBefore: 'A fixed step size', ledTo: 'Warmup-decay recipes for large models',
    learnPath: '/docs/deep-learning/initialization-regularization-scheduling',
  },
  {
    id: 'bptt', name: 'Backpropagation through time', year: 1990, era: 'sequence-vision', category: 'architecture', diagram: 'bptt',
    source: { label: 'Werbos, 1990', url: 'https://doi.org/10.1109/5.58337' },
    whatItIs: 'BPTT unrolls a recurrent computation across time and applies ordinary backpropagation to the resulting chain. It assigned credit to earlier hidden states when static feed-forward backpropagation had no representation of temporal reuse.',
    previousLimit: 'Backpropagation handled acyclic layers but not one recurrent state reused across an input sequence.',
    dataPreparation: 'Split ordered sequences into padded or packed windows, retain masks, and choose a truncation length when full histories are too large. Example sequence: tokens [A,B,C], next targets [B,C,D].',
    example: 'A loss at t=3 sends gradients through h₃→h₂→h₁; every path contributes to the same recurrent weight matrix.',
    metrics: 'Track sequence loss, task accuracy, gradient norm versus time distance, and memory per unrolled step. Long-distance gradients that vanish despite short-term learning expose the central failure.',
    whenNotToUse: 'Avoid full BPTT for very long histories that exceed memory; truncate it or use an architecture with shorter gradient paths.',
    replacedBy: 'Gated RNNs improved retention, and attention later supplied direct paths between distant positions.',
    cameBefore: 'Static-graph backpropagation', ledTo: 'Trainable RNNs, LSTMs, and attention',
    learnPath: '/docs/deep-learning/sequence-models',
  },
  {
    id: 'cnn-training', name: 'Convolutional network training', year: 1998, era: 'sequence-vision', category: 'architecture', diagram: 'cnn-training',
    source: { label: 'LeCun et al., 1998', url: 'https://doi.org/10.1109/5.726791' },
    whatItIs: 'CNN training shares each learned filter across image locations and backpropagates through convolution and subsampling. It encoded locality and translation structure that dense layers had to relearn separately at every pixel.',
    previousLimit: 'Dense image networks used too many parameters and ignored that the same visual pattern can occur anywhere.',
    dataPreparation: 'Resize and normalize images, encode labels, and batch tensors as channels×height×width. Example row: a 28×28 grayscale digit tensor with label 7.',
    example: 'One 3×3 edge kernel slides over every patch; gradients from all output positions sum into those same nine weights.',
    metrics: 'Measure validation accuracy or task-specific detection metrics, calibration, and error slices under shifts. Compare parameters and FLOPs with a dense baseline.',
    whenNotToUse: 'Do not assume translation equivariance fits unordered tabular data or tasks dominated by nonlocal relationships.',
    replacedBy: 'Residual CNNs made depth practical; vision transformers later traded the convolution prior for attention and larger-scale pretraining.',
    cameBefore: 'Dense pixel networks', ledTo: 'Deep residual vision models and transfer learning',
    learnPath: '/docs/deep-learning/cnns',
  },
  {
    id: 'transfer-learning', name: 'Transfer learning', year: 2014, era: 'sequence-vision', category: 'adaptation', diagram: 'transfer-learning',
    source: { label: 'Yosinski et al., 2014', url: 'https://proceedings.neurips.cc/paper/2014/hash/375c71349b295fbe2dcdca9206f20a06-Abstract.html' },
    whatItIs: 'Transfer learning initializes a target model from features learned on a source task, then freezes or fine-tunes some layers. It made strong target models possible when the target dataset could not support training every feature from scratch.',
    previousLimit: 'Each supervised task paid the full data and compute cost of relearning generic edges, shapes, or representations.',
    dataPreparation: 'Apply the source model preprocessing, map target labels, and split target data before tuning. Example row: resized 224×224 product image, target label defective.',
    example: 'Freeze the feature extractor for an initial classifier fit, then unfreeze later blocks with a lower learning rate.',
    metrics: 'Compare against scratch training at equal target-data budgets; report target validation metric, convergence steps, and source-to-target domain gap.',
    whenNotToUse: 'Avoid a mismatched source representation when negative transfer makes target validation worse than scratch training.',
    replacedBy: 'Foundation-model pretraining generalized transfer; parameter-efficient tuning limits how many pretrained weights must change.',
    cameBefore: 'Training every task from scratch', ledTo: 'Pretraining, fine-tuning, and parameter-efficient adaptation',
    learnPath: '/docs/deep-learning/vision-architectures',
  },
  {
    id: 'data-augmentation', name: 'Data augmentation', year: 2019, era: 'sequence-vision', category: 'regularization', diagram: 'augmentation',
    source: { label: 'Shorten and Khoshgoftaar, 2019', url: 'https://doi.org/10.1186/s40537-019-0197-0' },
    whatItIs: 'Data augmentation applies label-preserving transformations to create varied training views. It injects known invariances when collecting new labeled examples is costly and dropout or weight penalties cannot teach the model which changes should not matter.',
    previousLimit: 'A finite labeled set exposed too few poses, crops, lighting conditions, or corruptions for reliable generalization.',
    dataPreparation: 'Define transformations that preserve the target and apply them only to training examples. Example row: cat.jpg,label=cat becomes a cropped and horizontally flipped tensor with the same label.',
    example: 'Two random crops from one image share a label but show different pixels, forcing the classifier to rely on stable object evidence.',
    metrics: 'Compare clean validation performance and transformation-specific slices; inspect the train/validation gap. A drop on orientation-sensitive labels reveals an invalid transform.',
    whenNotToUse: 'Do not flip digits, rotate gravity-dependent scenes, or otherwise apply transformations that change the correct label.',
    replacedBy: 'Learned policies, Mixup-style methods, and self-supervised multi-view objectives extend the principle.',
    cameBefore: 'Fixed finite labeled datasets', ledTo: 'Multi-view self-supervision and stronger invariance priors',
    learnPath: '/docs/deep-learning/cnns',
  },
  {
    id: 'teacher-forcing', name: 'Teacher forcing', year: 1989, era: 'transformer-scale', category: 'architecture', diagram: 'teacher-forcing',
    source: { label: 'Williams and Zipser, 1989', url: 'https://doi.org/10.1162/neco.1989.1.2.270' },
    whatItIs: 'Teacher forcing feeds the ground-truth previous token into an autoregressive model during training instead of feeding its sampled prediction. It supplies a correct context at every position, avoiding a slow and unstable chain of discrete sampled decisions during optimization.',
    previousLimit: 'Free-running sequence training let one early mistake corrupt every later input and made gradients through sampled symbols problematic.',
    dataPreparation: 'Shift each target sequence into decoder inputs and next-token labels, with padding masked from loss. Example target [BOS, I, run, EOS] yields input [BOS,I,run] and labels [I,run,EOS].',
    example: 'At the third position the model receives the true token “I” even if its second-position argmax was “you”.',
    metrics: 'Read token loss together with free-running sequence quality. A large gap between teacher-forced loss and generated quality is exposure bias, not necessarily an optimizer failure.',
    whenNotToUse: 'Do not evaluate by teacher-forced accuracy alone when deployment is autoregressive; generated rollouts must be measured.',
    replacedBy: 'It remains the standard next-token training input scheme; scheduled sampling and sequence-level objectives address its train/inference mismatch selectively.',
    cameBefore: 'Free-running recurrent training', ledTo: 'Stable autoregressive next-token training',
    learnPath: '/docs/deep-learning/sequence-models',
  },
  {
    id: 'next-token-pretraining', name: 'Next-token pretraining', year: 2003, era: 'transformer-scale', category: 'self-supervision', diagram: 'next-token',
    source: { label: 'Bengio et al., 2003', url: 'https://www.jmlr.org/papers/v3/bengio03a.html' },
    whatItIs: 'Next-token pretraining predicts each token from its preceding context, turning raw ordered text into dense supervision without manual labels. It replaced sparse task labels with one target at almost every sequence position and learned reusable distributed representations.',
    previousLimit: 'Supervised language models needed task-specific labels and n-gram models could not share statistical strength well across similar words.',
    dataPreparation: 'Normalize and tokenize documents, concatenate or pack them into fixed-length sequences, and shift tokens by one for labels while masking boundaries as required. Example [the, cat, sat] creates context-target pairs []→the, [the]→cat, [the,cat]→sat.',
    example: 'For context “the cat”, cross-entropy increases the probability of “sat” and decreases competing vocabulary logits.',
    metrics: 'Report held-out negative log-likelihood or perplexity at a fixed tokenizer and evaluation corpus; compare downstream transfer separately. Perplexities from different vocabularies are not directly comparable.',
    whenNotToUse: 'Do not use it alone when the target behavior requires following instructions, grounded truth, or preferences not recoverable from continuation statistics.',
    replacedBy: 'It remains the base-model objective; instruction tuning and preference optimization shape behavior afterward.',
    cameBefore: 'Task labels and sparse n-gram statistics', ledTo: 'Foundation language models and post-training',
    learnPath: '/docs/llms-genai/foundation-model-internals',
  },
  {
    id: 'gradient-checkpointing', name: 'Gradient checkpointing', year: 2016, era: 'transformer-scale', category: 'systems', diagram: 'gradient-checkpointing',
    source: { label: 'Chen et al., 2016', url: 'https://arxiv.org/abs/1604.06174' },
    whatItIs: 'Gradient checkpointing saves selected forward activations and recomputes the missing segments during backpropagation. It trades extra computation for lower activation memory when storing every layer prevents a deeper model or longer sequence from fitting.',
    previousLimit: 'Standard backprop retained every intermediate activation until its gradient was computed.',
    dataPreparation: 'Prepare ordinary minibatches, then partition the model into deterministic segments and checkpoint boundaries. Example: for layers 1–8, retain activations after layers 0, 4, and 8.',
    example: 'During the reverse pass, layers 5–8 are rerun from checkpoint 4 before their local gradients are evaluated.',
    metrics: 'Measure peak allocated memory, examples per second, and wall-clock step time. A useful configuration frees enough memory for the desired batch or context without an unacceptable recompute penalty.',
    whenNotToUse: 'Avoid it when memory already fits comfortably or recomputation dominates expensive, nondeterministic, or stateful forward operations.',
    replacedBy: 'Selective activation checkpointing, memory-efficient attention, and sharding combine with the same recomputation trade.',
    cameBefore: 'Store every forward activation', ledTo: 'Training deeper and longer-context models within fixed memory',
    learnPath: '/docs/llms-genai/training-pipeline',
  },
  {
    id: 'mixed-precision', name: 'Mixed-precision training', year: 2017, era: 'transformer-scale', category: 'systems', diagram: 'mixed-precision',
    source: { label: 'Micikevicius et al., 2017', url: 'https://arxiv.org/abs/1710.03740' },
    whatItIs: 'Mixed precision performs many operations in FP16 while retaining selected FP32 state and scaling the loss to protect small gradients. It reduced memory and used faster low-precision hardware without the underflow and update loss of naive all-FP16 training.',
    previousLimit: 'FP32 consumed memory and throughput, while simply casting everything to FP16 lost small gradients and parameter updates.',
    dataPreparation: 'Use the same minibatches, maintain FP32 master weights or optimizer state, and choose dynamic loss scaling. Example loss 0.002 is multiplied by 1024 before backward and gradients are divided by 1024 before the step.',
    example: 'A gradient 2e-8 that underflows in FP16 becomes about 2e-5 during the scaled backward pass, then is safely unscaled in FP32.',
    metrics: 'Measure throughput, peak memory, overflow/scale events, and validation parity with FP32. Frequent skipped steps show that the scale or numerics remain unstable.',
    whenNotToUse: 'Avoid unsupported kernels or numerically sensitive reductions that require higher precision; keep those operations in FP32.',
    replacedBy: 'BF16 often removes loss scaling because of its wider exponent, while FP8 recipes add tighter scaling and calibration.',
    cameBefore: 'Uniform FP32 or unstable all-FP16 training', ledTo: 'BF16 and FP8 large-model training',
    learnPath: '/docs/llms-genai/training-pipeline',
  },
  {
    id: 'gradient-accumulation', name: 'Gradient accumulation', year: 2017, era: 'transformer-scale', category: 'systems', diagram: 'gradient-accumulation',
    source: { label: 'Goyal et al., 2017', url: 'https://arxiv.org/abs/1706.02677' },
    whatItIs: 'Gradient accumulation sums gradients from several microbatches before one optimizer step, approximating a larger batch without storing all activations together. It solved the device-memory limit on batch size, not the compute cost of processing those examples.',
    previousLimit: 'A desired global batch could exceed accelerator memory even when the model itself fit.',
    dataPreparation: 'Shuffle examples, split each logical batch into equal microbatches, divide each microbatch loss by the accumulation count, and step only after the last one. Example: four microbatches of 8 form global batch 32 on one worker.',
    example: 'Gradients g₁…g₄ are added into parameter buffers; the optimizer sees (g₁+g₂+g₃+g₄)/4 once.',
    metrics: 'Track optimizer steps separately from microsteps, global examples per step, memory, throughput, and validation at equal examples seen. Wrong loss scaling changes the effective learning rate.',
    whenNotToUse: 'Avoid it when additional microsteps make training latency unacceptable or when batch-dependent layers require true simultaneous statistics.',
    replacedBy: 'It remains useful alongside data parallelism; sharding can instead free enough memory for a larger physical batch.',
    cameBefore: 'One physical batch per optimizer step', ledTo: 'Large effective batches on memory-limited devices',
    learnPath: '/docs/llms-genai/training-pipeline',
  },
  {
    id: 'distributed-training', name: 'Distributed training', year: 2019, era: 'transformer-scale', category: 'systems', diagram: 'distributed-training',
    source: { label: 'Shoeybi et al., 2019', url: 'https://arxiv.org/abs/1909.08053' },
    whatItIs: 'Distributed training divides examples, parameters, optimizer state, or layers across workers and coordinates the required gradients and activations. It let model and dataset scale exceed one accelerator, where accumulation alone could not make the parameters fit or shorten total compute time.',
    previousLimit: 'Single-device memory and throughput bounded model size, context, and time-to-train.',
    dataPreparation: 'Shard and shuffle the dataset deterministically, define data/model/pipeline groups, and ensure each global sample is counted once. Example: 8 data-parallel workers each read 4 rows for global batch 32, then all-reduce gradients.',
    example: 'Tensor parallelism splits a matrix multiply across two devices; each computes partial outputs and a collective reconstructs the next activation.',
    metrics: 'Report model FLOP utilization, samples per second, scaling efficiency, communication time, and straggler distribution. More devices are useful only while wall-clock reduction outweighs coordination.',
    whenNotToUse: 'Do not distribute a small model or short run whose communication and operational overhead exceed local training time.',
    replacedBy: 'Hybrid data, tensor, pipeline, sequence, and fully sharded strategies compose according to the memory bottleneck.',
    cameBefore: 'Single-accelerator training', ledTo: 'Hybrid parallel foundation-model training',
    learnPath: '/docs/llms-genai/training-pipeline',
  },
];

export const trainingCategories: TrainingCategory[] = Array.from(
  new Set(trainingAtlas.map((entry) => entry.category)),
);
